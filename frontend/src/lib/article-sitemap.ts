import type { Article } from '@/types';
import { NewsService } from '@/services/news.service';

export async function getAllPublishedArticles(contentType: 'news' | 'blog'): Promise<Article[]> {
  const first = await NewsService.getArticles({ page: 1, page_size: 100, is_published: 'true', content_type: contentType });
  const articles = [...(first.data || [])];
  const totalPages = Math.max(1, first.total_pages || 1);
  for (let page = 2; page <= totalPages; page++) {
    const next = await NewsService.getArticles({ page, page_size: 100, is_published: 'true', content_type: contentType });
    articles.push(...(next.data || []));
  }
  return articles;
}
