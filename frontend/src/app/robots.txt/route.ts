import { getRequestBaseUrl } from '@/lib/request-url';
import { buildRobotsTxt, PUBLIC_CONTENT_SIGNAL_POLICY } from '@/lib/robots';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  const siteUrl = await getRequestBaseUrl();
  return new Response(buildRobotsTxt(siteUrl), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Content-Signal': PUBLIC_CONTENT_SIGNAL_POLICY,
    },
  });
}
