/** The retired address. Visitors (and old links, bookmarks and search results) are sent to the main domain. */
export const OLD_HOSTS = ['homeops.khaw.cc'];

/**
 * Where a request for `host` should be redirected, or null to serve it normally.
 * `target` is the main address (NEXTAUTH_URL). Nothing is redirected when no valid target is set,
 * or when the target is itself the requested host (so a misconfiguration can never cause a redirect loop).
 */
export function canonicalRedirect(requestUrl: URL, host: string, target: string | undefined): URL | null {
  const h = host.toLowerCase().replace(/:\d+$/, '');
  if (!OLD_HOSTS.includes(h) || !target) return null;
  let main: URL;
  try {
    main = new URL(target);
  } catch {
    return null;
  }
  if (main.hostname.toLowerCase() === h || !/^https?:$/.test(main.protocol)) return null;
  const out = new URL(requestUrl.pathname + requestUrl.search, main.origin);
  return out;
}
