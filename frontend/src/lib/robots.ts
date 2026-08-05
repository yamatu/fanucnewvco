export const PUBLIC_CONTENT_SIGNAL_POLICY = 'search=yes, ai-input=yes, ai-train=yes, use=reference';

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

const SEARCH_CRAWLERS = ['Googlebot', 'Bingbot'] as const;

const AI_CRAWLERS = [
  'GPTBot',
  'ChatGPT-User',
  'Google-Extended',
  'PerplexityBot',
  'ClaudeBot',
  'anthropic-ai',
  'Amazonbot',
  'Applebot-Extended',
  'Bytespider',
  'CCBot',
  'meta-externalagent',
] as const;

function renderGroup(userAgents: readonly string[], includeContentSignal = false): string {
  return [
    ...userAgents.map((userAgent) => `User-agent: ${userAgent}`),
    ...(includeContentSignal ? [`Content-Signal: ${PUBLIC_CONTENT_SIGNAL_POLICY}`] : []),
    'Allow: /',
    ...PRIVATE_ROBOTS_PATHS.map((path) => `Disallow: ${path}`),
  ].join('\n');
}

export function buildRobotsTxt(siteUrl: string): string {
  const site = siteUrl.replace(/\/+$/, '');
  return [
    '# Public search, AI input, and AI training are allowed. Private application paths remain excluded.',
    renderGroup(['*'], true),
    renderGroup(SEARCH_CRAWLERS),
    renderGroup(AI_CRAWLERS),
    `Sitemap: ${site}/sitemap.xml`,
  ].join('\n\n') + '\n';
}
