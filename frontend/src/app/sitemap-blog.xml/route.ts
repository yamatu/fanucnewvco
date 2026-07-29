import { NextResponse } from 'next/server';
import { getRequestBaseUrl } from '@/lib/request-url';
import { getAllPublishedArticles } from '@/lib/article-sitemap';
import type { Article } from '@/types';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export async function GET() {
  const baseUrl = await getRequestBaseUrl();
  let articles: Article[] = [];
  try {
    articles = await getAllPublishedArticles('blog');
  } catch (error) {
    console.error('Error generating blog sitemap:', error);
  }
  const urls = [{ url: `${baseUrl}/blog`, lastModified: new Date().toISOString(), changeFrequency: 'daily', priority: '0.8' }, ...articles.map((article) => ({
    url: `${baseUrl}${article.public_path || `/blog/${article.slug}`}`,
    lastModified: new Date(article.updated_at || article.published_at || article.created_at).toISOString(),
    changeFrequency: 'weekly', priority: article.is_featured ? '0.8' : '0.7',
  }))];
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((item) => `  <url>\n    <loc>${escapeXml(item.url)}</loc>\n    <lastmod>${item.lastModified}</lastmod>\n    <changefreq>${item.changeFrequency}</changefreq>\n    <priority>${item.priority}</priority>\n  </url>`).join('\n')}\n</urlset>`;
  return new NextResponse(sitemap, { headers: { 'Content-Type': 'application/xml', 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
}
