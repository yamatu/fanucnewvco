import { getRequestBaseUrl } from '@/lib/request-url'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 86400

export async function GET() {
  const baseUrl = await getRequestBaseUrl()
  // This legacy URL was once a nested sitemap index. Redirect it to the only
  // supported Search Console submission entry so crawlers cannot rediscover a
  // nested index and old saved submissions converge on the primary sitemap.
  return NextResponse.redirect(`${baseUrl}/sitemap.xml`, {
    status: 301,
    headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
  })
}
