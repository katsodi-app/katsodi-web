// The standalone API has no browser session. Native requests carry a bearer
// token (src/lib/supabase/actor.ts) and never reach cookies(); guest reads
// (meta, public room list) get an empty cookie jar, i.e. the anonymous role.
export async function cookies() {
  return {
    getAll: () => [] as { name: string; value: string }[],
    get: () => undefined,
    set: () => {},
  };
}
export async function headers() {
  return new Headers();
}
