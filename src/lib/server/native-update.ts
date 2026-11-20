/**
 * The desktop app's newest installer, set by the owner at release time:
 * NATIVE_UPDATE_VERSION (x.y.z), NATIVE_UPDATE_URL (https, on GitHub or
 * katsodi.watch) and NATIVE_UPDATE_SHA256 (of the installer). The app
 * offers it only when all three are valid, and checks the file's SHA-256.
 */
export function updateInfo(
  env: Record<string, string | undefined> = process.env,
) {
  const version = env.NATIVE_UPDATE_VERSION?.trim() ?? "";
  const url = env.NATIVE_UPDATE_URL?.trim() ?? "";
  const sha256 = env.NATIVE_UPDATE_SHA256?.trim().toLowerCase() ?? "";
  if (
    !/^\d{1,4}\.\d{1,4}\.\d{1,6}$/.test(version) ||
    !/^[0-9a-f]{64}$/.test(sha256)
  )
    return null;
  try {
    const parsed = new URL(url);
    const allowed =
      parsed.protocol === "https:" &&
      (parsed.hostname === "katsodi.watch" ||
        (parsed.hostname === "github.com" &&
          parsed.pathname.startsWith("/katsodi-app/")));
    return allowed && url.length <= 512 ? { version, url, sha256 } : null;
  } catch {
    return null;
  }
}
