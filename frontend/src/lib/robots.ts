// Content Signals (https://contentsignals.org): public pages may be indexed for
// search, used as AI answer input and used for training. Sent as an HTTP header
// on public responses so robots.txt keeps only standard crawl directives.
export const PUBLIC_CONTENT_SIGNAL_POLICY = 'search=yes, ai-input=yes, ai-train=yes, use=reference';

// Private areas: disallowed in robots.txt and never sent a Content-Signal.
export const PRIVATE_ROBOTS_PATHS = [
  '/admin/',
  '/api/',
  '/account/',
  '/checkout/',
  '/orders/',
  '/login',
  '/register',
  '/forgot-password',
  '/track-order',
] as const;

export function isPrivateRobotsPath(pathname: string): boolean {
  return PRIVATE_ROBOTS_PATHS.some((path) => {
    const base = path.replace(/\/+$/, '');
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}
