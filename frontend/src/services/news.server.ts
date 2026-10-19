import { cache } from 'react';
import { isAxiosError } from 'axios';
import { notFound } from 'next/navigation';
import { NewsService } from './news.service';

// Article pages are ISR-cached. Metadata and page rendering share one result
// per request, and only a confirmed missing article is a 404: backend outages
// must throw so the last good page keeps being served instead of a cached 404.
export const getArticleBySlug = cache(async (slug: string) => {
  try {
    return await NewsService.getArticleBySlug(slug);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) notFound();
    throw error;
  }
});
