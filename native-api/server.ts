import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";

/**
 * Katsodi native API as its own process: the same /api/native/v1 route
 * handlers as the website (bundled from src/app/api/native/v1 by build.mjs),
 * served by node:http without Next.js. Authorization, validation, RLS and
 * the error envelope belong to the handlers; this file only routes.
 */

type Handler = (
  request: Request,
  context: { params: Promise<Record<string, string>> },
) => Promise<Response>;
export type RouteModule = Partial<
  Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", Handler>
>;
export type RouteEntry = { path: string; module: RouteModule };

const MAX_BODY = 1024 * 1024; // handlers enforce their own, smaller limits
const PREFIX = "/api/native/v1/";

type Compiled = {
  pattern: RegExp;
  names: string[];
  statics: number;
  module: RouteModule;
  path: string;
};

export function compileRoutes(routes: RouteEntry[]): Compiled[] {
  return (
    routes
      .map(({ path, module }) => {
        const segments = path.split("/").filter(Boolean);
        const names: string[] = [];
        const source = segments
          .map((segment) => {
            const dynamic = /^\[(\w+)\]$/.exec(segment);
            if (!dynamic) return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            names.push(dynamic[1]);
            return "([^/]+)";
          })
          .join("/");
        return {
          pattern: new RegExp(`^${source}$`),
          names,
          statics: segments.length - names.length,
          module,
          path,
        };
      })
      // A static segment wins over a parameter at the same depth.
      .sort((a, b) => b.statics - a.statics)
  );
}

export function match(routes: Compiled[], pathname: string) {
  if (!pathname.startsWith(PREFIX)) return null;
  const rest = pathname.slice(PREFIX.length).replace(/\/$/, "");
  for (const route of routes) {
    const found = route.pattern.exec(rest);
    if (!found) continue;
    const params: Record<string, string> = {};
    try {
      route.names.forEach(
        (name, i) => (params[name] = decodeURIComponent(found[i + 1])),
      );
    } catch {
      return null;
    }
    return { route, params };
  }
  return null;
}

function envelope(status: number, code: string, messageKey: string) {
  const requestId = randomUUID();
  return Response.json(
    { error: { code, messageKey, retryable: false, requestId } },
    {
      status,
      headers: { "Cache-Control": "private, no-store", "X-Request-Id": requestId },
    },
  );
}

async function readBody(req: IncomingMessage): Promise<Buffer | "too_large"> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY) return "too_large";
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function handle(
  routes: Compiled[],
  origin: string,
  req: IncomingMessage,
): Promise<Response> {
  const method = (req.method ?? "GET").toUpperCase();
  let url: URL;
  try {
    // The configured origin, never the Host header, so a request cannot
    // make the handlers believe they serve another site.
    url = new URL(req.url ?? "/", origin);
  } catch {
    return envelope(400, "invalid_request", "native.errorInvalid");
  }
  if (method === "GET" && url.pathname === "/healthz")
    return Response.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  const found = match(routes, url.pathname);
  if (!found) return envelope(404, "not_found", "native.errorNotFound");
  const handler = found.route.module[method as keyof RouteModule];
  if (!handler) return envelope(405, "invalid_request", "native.errorInvalid");

  const headers = new Headers();
  for (const [name, values] of Object.entries(req.headersDistinct ?? {})) {
    // Repeated headers are joined, so two Authorization headers become one
    // malformed value that parseBearer rejects (node would keep only one).
    if (values) headers.set(name, values.join(", "));
  }
  let body: Buffer | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const read = await readBody(req);
    if (read === "too_large")
      return envelope(413, "invalid_request", "native.errorInvalid");
    body = read;
  }
  const request = new Request(url, {
    method,
    headers,
    body: body && body.length ? new Uint8Array(body) : undefined,
  });
  return handler(request, { params: Promise.resolve(found.params) });
}

async function send(res: ServerResponse, response: Response) {
  res.statusCode = response.status;
  response.headers.forEach((value, name) => res.setHeader(name, value));
  res.end(Buffer.from(await response.arrayBuffer()));
}

export function start(entries: RouteEntry[]) {
  const host = process.env.KATSODI_API_HOST || "127.0.0.1";
  const port = Number(process.env.KATSODI_API_PORT || 8787);
  const origin =
    process.env.KATSODI_API_PUBLIC_ORIGIN ||
    `http://${host.includes(":") ? `[${host}]` : host}:${port}`;
  const routes = compileRoutes(entries);
  const quiet = process.env.KATSODI_API_QUIET === "1";

  const server = createServer(async (req, res) => {
    const started = performance.now();
    let response: Response;
    try {
      response = await handle(routes, origin, req);
    } catch {
      // Handlers already turn their failures into the envelope; this is a
      // last resort that never echoes the exception.
      response = envelope(500, "server_error", "native.errorServer");
    }
    await send(res, response).catch(() => res.destroy());
    if (!quiet) {
      // Method, path and status only: never headers or bodies (tokens, chat).
      const path = (req.url ?? "").split("?")[0];
      console.log(
        `${req.method} ${path} ${response.status} ${Math.round(performance.now() - started)}ms`,
      );
    }
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.error(
        `Port ${port} on ${host} is already in use: another native API (or another program) is running.\n` +
          `Stop it, or start this one on another port: set KATSODI_API_PORT and run the app with KATSODI_API_ORIGIN.`,
      );
      process.exit(1);
    }
    throw error;
  });
  server.requestTimeout = 30_000;
  server.headersTimeout = 15_000;
  server.listen(port, host, () => {
    console.log(`Katsodi native API on ${origin} (${routes.length} routes)`);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.warn(
        "Supabase is not configured: set NEXT_PUBLIC_SUPABASE_URL and the publishable key (.env.local).",
      );
  });
  const stop = () => server.close(() => process.exit(0));
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  return server;
}
