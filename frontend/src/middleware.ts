import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  DEFAULT_PUBLIC_LOCALE,
  PUBLIC_LOCALE_COOKIE,
  getLocaleFromPathname,
  isLocalizablePublicPath,
  localizePublicPath,
  normalizePublicLocale,
  stripLocaleFromPathname,
} from '@/lib/i18n/config';

// Define protected routes
const protectedRoutes = ['/admin'];
const authRoutes = ['/admin/login', '/admin/forgot-password'];

// List of search engine crawlers
const SEARCH_ENGINE_BOTS = [
  'googlebot',
  'bingbot',
  'slurp', // Yahoo
  'duckduckbot',
  'baiduspider',
  'yandexbot',
  'facebookexternalhit',
  'twitterbot',
  'linkedinbot',
  'whatsapp',
  'telegrambot',
  // AI search engine bots
  'gptbot',
  'chatgpt-user',
  'perplexitybot',
  'claudebot',
  'anthropic-ai',
  'google-extended',
  'applebot',
  'cohere-ai',
];

function isSearchEngineCrawler(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return SEARCH_ENGINE_BOTS.some(bot => ua.includes(bot));
}

function getBackendBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://backend:8080').replace(/\/+$/, '');
}

function getRequestHostname(request: NextRequest): string {
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0].trim();
  const incomingHost = forwardedHost || request.headers.get('host') || request.nextUrl.host;
  try {
    return new URL(`http://${incomingHost}`).hostname.toLowerCase();
  } catch {
    return request.nextUrl.hostname.toLowerCase();
  }
}

function getCanonicalHostname(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vcocncspare.com';
  try {
    return new URL(configured).hostname.toLowerCase();
  } catch {
    return 'www.vcocncspare.com';
  }
}

export async function middleware(request: NextRequest) {
  const rawPathname = request.nextUrl.pathname;
  const pathLocale = getLocaleFromPathname(rawPathname);
  const pathname = stripLocaleFromPathname(rawPathname);
  const locale = pathLocale || DEFAULT_PUBLIC_LOCALE;
  const token = request.cookies.get('auth_token')?.value;
  const userAgent = request.headers.get('user-agent') || '';

  if (pathLocale && !isLocalizablePublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    return NextResponse.redirect(url, 308);
  }

  const savedLocale = normalizePublicLocale(request.cookies.get(PUBLIC_LOCALE_COOKIE)?.value);
  if (!pathLocale && savedLocale !== DEFAULT_PUBLIC_LOCALE && isLocalizablePublicPath(pathname) && !isSearchEngineCrawler(userAgent)) {
    const url = request.nextUrl.clone();
    url.pathname = localizePublicPath(pathname, savedLocale);
    return NextResponse.redirect(url, 307);
  }

  const requestHostname = getRequestHostname(request);
  const canonicalHostname = getCanonicalHostname();
  const canonicalApex = canonicalHostname.startsWith('www.') ? canonicalHostname.slice(4) : '';
  if (canonicalApex && requestHostname === canonicalApex) {
    const canonicalUrl = request.nextUrl.clone();
    canonicalUrl.protocol = 'https';
    canonicalUrl.hostname = canonicalHostname;
    canonicalUrl.port = '';
    return NextResponse.redirect(canonicalUrl, 301);
  }

  const indexNowKeyMatch = pathname.match(/^\/([A-Za-z0-9_-]{8,128})\.txt$/);
  if (indexNowKeyMatch) {
    const requestedKey = indexNowKeyMatch[1];
    try {
      const res = await fetch(`${getBackendBaseUrl()}/api/v1/public/indexnow/key`, {
        cache: 'no-store',
      });
      if (!res.ok) {
        return new NextResponse('Not Found', {
          status: 404,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }

      const json = await res.json();
      const configuredKey = String(json?.data?.key || '').trim();
      if (!configuredKey || configuredKey !== requestedKey) {
        return new NextResponse('Not Found', {
          status: 404,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });
      }

      return new NextResponse(configuredKey, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    } catch {
      return new NextResponse('Not Found', {
        status: 404,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      });
    }
  }

  // Redirect legacy product sitemap URLs:
  // /sitemap-products-1.xml -> /sitemap-products/1.xml
  const legacySitemapMatch = pathname.match(/^\/sitemap-products-(\d+)\.xml$/);
  if (legacySitemapMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/sitemap-products/${legacySitemapMatch[1]}.xml`;
    return NextResponse.redirect(url, 301);
  }

  // Serve /sitemap-products/:page.xml by rewriting to an internal route
  // /sitemap-products/1.xml -> /sitemap-products/1 (keeps .xml in the URL)
  const productsSitemapMatch = pathname.match(/^\/sitemap-products\/(\d+)\.xml$/);
  if (productsSitemapMatch) {
    const url = request.nextUrl.clone();
    url.pathname = `/sitemap-products/${productsSitemapMatch[1]}`;
    return NextResponse.rewrite(url);
  }

  // Handle product URL redirects for SEO-friendly URLs
  // Redirect old format /products/[sku] to new format /products/[sku]-[slug]
  if (pathname.match(/^\/products\/[A-Z0-9][A-Z0-9\-._]*$/i) && !pathname.includes('-')) {
    // This looks like an old SKU-only URL, but we need to check if it exists first
    // For now, let the route handler deal with it to avoid complexity here
  }

  // Canonicalize legacy FANUC-prefixed product URLs to the shared product slug rule.
  if (/^\/products\/FANUC-/i.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = localizePublicPath(pathname.replace(/^\/products\/FANUC-/i, '/products/'), locale);
    return NextResponse.redirect(url, 301);
  }

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route) && !authRoutes.some(authRoute => pathname.startsWith(authRoute))
  );

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));

  // If accessing a protected route without a token, redirect to login
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/admin/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If accessing auth route with a token, redirect to admin dashboard
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // Create response with SEO optimizations
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-site-locale', locale);
  requestHeaders.set('x-site-pathname', pathname);

  const response = pathLocale
    ? NextResponse.rewrite(
        (() => {
          const url = request.nextUrl.clone();
          url.pathname = pathname;
          return url;
        })(),
        { request: { headers: requestHeaders } },
      )
    : NextResponse.next({ request: { headers: requestHeaders } });

  if (pathLocale) {
    response.cookies.set(PUBLIC_LOCALE_COOKIE, pathLocale, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
      sameSite: 'lax',
    });
  }

  // Special handling for search engine crawlers
  if (isSearchEngineCrawler(userAgent)) {
    // Ensure no caching for crawlers on dynamic pages
    if (pathname.startsWith('/products') || pathname.includes('sitemap')) {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      response.headers.set('Pragma', 'no-cache');
      response.headers.set('Expires', '0');
    }
    // Do not force X-Robots-Tag here; let per-page metadata control indexing
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  response.headers.set(
    'Content-Security-Policy',
    "base-uri 'self'; frame-ancestors 'none'; object-src 'none'"
  );

  // Let per-page metadata control robots; avoid overriding here

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public).*)',
  ],
};
