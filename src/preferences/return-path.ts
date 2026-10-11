/**
 * Where the header's theme switch sends you back to. The switch lives in the
 * root layout, which doesn't know which page it is on, and a form posted with
 * no JavaScript has to end in a redirect (Team convention 9), so the action
 * reads the `Referer` the browser sent: the page the switch was used on.
 *
 * Only the path is kept, never the query: `/account?saved=days` would bring a
 * stale "Days saved." message back. And only a same-site referer counts, so a
 * post from another site can't use this to bounce someone elsewhere. No
 * referer (some browsers and extensions strip it) or anything odd: the home
 * screen.
 *
 * Pure (no `next/headers`) so a test can run it.
 */

/** `hosts` are the names this site is served under (the `Host` and `X-Forwarded-Host` headers). */
export function returnPath(referer: string | null, hosts: readonly (string | null)[]): string {
  if (!referer) return "/";
  let url: URL;
  try {
    url = new URL(referer);
  } catch {
    return "/";
  }
  if (!hosts.includes(url.host)) return "/";
  // "//host/..." and "/\host" are read by browsers as another site, not a path on this one.
  if (url.pathname.startsWith("//") || url.pathname.includes("\\")) return "/";
  return url.pathname;
}
