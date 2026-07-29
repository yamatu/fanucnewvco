'use client';

import Link from 'next/link';
import { CalendarDaysIcon, EyeIcon, ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';
import type { Article } from '@/types';
import MarkdownContent from '@/components/content/MarkdownContent';

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function ArticleDetailClient({ article }: { article: Article }) {
  const readTime = estimateReadTime(article.content);
  const basePath = article.content_type === 'blog' ? '/blog' : '/news';
  const sectionName = article.content_type === 'blog' ? 'Blog' : 'News';

  return (
    <Layout>
      <div className="bg-white min-h-screen">
        {/* Hero */}
        {article.featured_image && (
          <div className="relative h-[300px] sm:h-[400px] lg:h-[500px] bg-gray-900">
            <img
              src={article.featured_image}
              alt={article.title}
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="py-4 text-sm">
            <ol className="flex items-center gap-2 text-gray-500">
              <li>
                <Link href="/" className="hover:text-blue-600">Home</Link>
              </li>
              <li>/</li>
              <li>
                <Link href={basePath} className="hover:text-blue-600">{sectionName}</Link>
              </li>
              <li>/</li>
              <li className="text-gray-900 truncate max-w-[200px]">{article.title}</li>
            </ol>
          </nav>

          {/* Article Header */}
          <header className={`${article.featured_image ? '-mt-24 relative z-10' : 'mt-4'}`}>
            <div className={`${article.featured_image ? 'bg-white rounded-t-2xl p-6 sm:p-8 shadow-sm' : ''}`}>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 leading-tight mb-4">
                {article.title}
              </h1>
              {article.summary && (
                <p className="text-lg text-gray-600 mb-6">{article.summary}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 pb-6 border-b border-gray-200">
                {article.author?.full_name && (
                  <span className="flex items-center gap-1.5">
                    <UserIcon className="h-4 w-4" />
                    {article.author.full_name}
                  </span>
                )}
                <span className="flex items-center gap-1.5">
                  <CalendarDaysIcon className="h-4 w-4" />
                  {new Date(article.published_at || article.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <EyeIcon className="h-4 w-4" />
                  {article.view_count} views
                </span>
                <span>{readTime} min read</span>
              </div>
            </div>
          </header>

          {/* Article Content */}
          <article className="py-8 sm:py-10">
            <MarkdownContent content={article.content} className="max-w-none text-lg" />
          </article>

          {/* Back to News */}
          <div className="border-t border-gray-200 py-8">
            <Link
              href={basePath}
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to {sectionName}
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
