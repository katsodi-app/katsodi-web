import { lookup } from "node:dns/promises";
import { request } from "node:https";
import { BlockList, isIP } from "node:net";
import { inspectSource } from "../providers";
import { retiredParserSource } from "../player-recipes";

const reserved = new BlockList();
for (const [ip, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.88.99.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const)
  reserved.addSubnet(ip, prefix, "ipv4");
const globalV6 = new BlockList();
globalV6.addSubnet("2000::", 3, "ipv6");
for (const [ip, prefix] of [
  ["2001::", 23],
  ["2001:db8::", 32],
  ["2002::", 16],
  ["3fff::", 20],
] as const)
  reserved.addSubnet(ip, prefix, "ipv6");

export function publicAddress(ip: string) {
  const family = isIP(ip);
  return family === 4
    ? !reserved.check(ip, "ipv4")
    : family === 6 && globalV6.check(ip, "ipv6") && !reserved.check(ip, "ipv6");
}
export class PublicPageError extends Error {
  constructor(readonly reason: "blocked" | "unavailable") {
    super(reason);
  }
}
export type PublicPage = { body: string; headers: Headers; url: string };

/** No ambient cookies, proxy, credentials, decompression or second DNS lookup. */
export async function publicPlayerPage(
  input: string,
  deadline: number,
  redirects = 0,
  /** "json" is used only for oEmbed documents a page itself declares. */
  format: "html" | "json" = "html",
): Promise<PublicPage> {
  const accepted =
    format === "json"
      ? /^(?:application\/json|application\/json\+oembed|text\/javascript)(?:;|$)/i
      : /^(?:text\/html|application\/xhtml\+xml)(?:;|$)/i;
  const maxBytes = format === "json" ? 256 * 1024 : 2 * 1024 * 1024;
  const safe = inspectSource(input);
  if (
    !safe ||
    retiredParserSource(input) ||
    Date.now() >= deadline ||
    redirects > 3
  )
    throw new PublicPageError("blocked");
  const url = new URL(safe.url);
  url.hash = "";
  const signal = AbortSignal.timeout(
    Math.max(1, Math.min(8000, deadline - Date.now())),
  );
  const addresses = await new Promise<{ address: string; family: number }[]>(
    (resolve, reject) => {
      const aborted = () => reject(new PublicPageError("unavailable"));
      signal.addEventListener("abort", aborted, { once: true });
      lookup(url.hostname, { all: true, verbatim: true })
        .then(resolve, reject)
        .finally(() => signal.removeEventListener("abort", aborted));
    },
  );
  if (
    !addresses.length ||
    addresses.some(({ address }) => !publicAddress(address))
  )
    throw new PublicPageError("blocked");
  const pinned = addresses.find(({ family }) => family === 4) || addresses[0];
  const result = await new Promise<PublicPage & { redirect?: string }>(
    (resolve, reject) => {
      const req = request(
        url,
        {
          method: "GET",
          agent: false,
          signal,
          family: pinned.family,
          lookup: (_hostname, _options, callback) =>
            callback(null, pinned.address, pinned.family),
          headers: {
            Accept:
              format === "json"
                ? "application/json"
                : "text/html,application/xhtml+xml",
            "Accept-Encoding": "identity",
          },
          maxHeaderSize: 32768,
        },
        (response) => {
          const headers = new Headers();
          for (let i = 0; i < response.rawHeaders.length; i += 2)
            headers.append(response.rawHeaders[i], response.rawHeaders[i + 1]);
          const status = response.statusCode || 0;
          if (
            [301, 302, 303, 307, 308].includes(status) &&
            headers.get("location")
          ) {
            response.destroy();
            try {
              resolve({
                body: "",
                headers,
                url: url.href,
                redirect: new URL(headers.get("location")!, url).href,
              });
            } catch {
              reject(new PublicPageError("blocked"));
            }
            return;
          }
          if (
            status !== 200 ||
            !accepted.test(headers.get("content-type") || "") ||
            ![null, "identity"].includes(headers.get("content-encoding"))
          ) {
            response.destroy();
            reject(
              new PublicPageError(
                [401, 403].includes(status) ? "blocked" : "unavailable",
              ),
            );
            return;
          }
          let size = 0;
          const chunks: Buffer[] = [];
          response.on("data", (chunk: Buffer) => {
            size += chunk.length;
            if (size > maxBytes) {
              response.destroy(new PublicPageError("unavailable"));
              return;
            }
            chunks.push(chunk);
          });
          response.on("error", reject);
          response.on("end", () =>
            resolve({
              body: Buffer.concat(chunks).toString("utf8"),
              headers,
              url: url.href,
            }),
          );
        },
      );
      req.on("error", reject);
      req.end();
    },
  );
  return result.redirect
    ? publicPlayerPage(result.redirect, deadline, redirects + 1, format)
    : result;
}
