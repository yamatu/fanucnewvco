import { headers } from 'next/headers';
import { getSiteUrl } from '@/lib/url';

function isLocalHostname(hostname: string): boolean {
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i.test(hostname);
}

function normalizeHost(host: string, proto: string): string {
  const h = host.trim();
  if (!h) return h;
  // IPv6 host already bracketed
  if (h.startsWith('[')) return h;

  const idx = h.lastIndexOf(':');
  if (idx <= 0) return h;

  const hostname = h.slice(0, idx);
  const portStr = h.slice(idx + 1);
  const port = Number(portStr);
  if (!Number.isFinite(port)) return h;

  if (isLocalHostname(hostname)) return h;

  // Strip standard ports
  if ((proto === 'http' && port === 80) || (proto === 'https' && port === 443)) {
    return hostname;
  }

  // If a public domain is accidentally exposed with internal dev ports, strip them.
  if (port === 3000 || port === 3001 || port === 8080) {
    return hostname;
  }

  return h;
}

// Best-effort base URL resolution for route handlers (robots/sitemaps).
// Prefer the incoming request host/proto so generated URLs don't accidentally
// include dev ports or internal service names.
export async function getRequestBaseUrl(): Promise<string> {
  try {
    const h = await headers();
    const host = h.get('x-forwarded-host') || h.get('host');
    const proto = h.get('x-forwarded-proto') || 'https';
    if (host) {
      const normalizedHost = normalizeHost(host, proto);
      return `${proto}://${normalizedHost}`.replace(/\/+$/, '');
    }
  } catch {
    // ignore
  }
  return getSiteUrl();
}
