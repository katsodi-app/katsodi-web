// Website-only actions redirect after success; native routes never call them.
// Fail loudly if one ever does instead of silently returning.
export function redirect(path: string): never {
  throw new Error(`redirect(${path}) is not available in the standalone API`);
}
export function notFound(): never {
  throw new Error("notFound() is not available in the standalone API");
}
