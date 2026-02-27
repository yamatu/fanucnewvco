'use client';

import Link from 'next/link';
import { CalendarDaysIcon, EyeIcon, ArrowLeftIcon, UserIcon } from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';
import type { Article } from '@/types';

function markdownToHtml(md: string): string {
  let html = md;
  // Code blocks (must be before inline code)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto my-6 text-sm"><code>$2</code></pre>');
  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-900 mt-6 mb-2">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-8 mb-3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-10 mb-4">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-gray-900 mt-10 mb-4">$1</h1>');
  // Horizontal rule
  html = html.replace(/^---$/gm, '<hr class="my-8 border-gray-200" />');
  // Bold / Italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="my-6"><img src="$2" alt="$1" class="w-full rounded-lg shadow-sm" /><figcaption class="text-center text-sm text-gray-500 mt-2">$1</figcaption></figure>');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>');
  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="border-l-4 border-blue-500 pl-4 py-1 my-4 text-gray-700 italic">$1</blockquote>');
  // Unordered lists
  html = html.replace(/^\- (.+)$/gm, '<li class="ml-6 list-disc text-gray-700">$1</li>');
  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-6 list-decimal text-gray-700">$1</li>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1.5 py-0.5 rounded text-sm text-gray-800 font-mono">$1</code>');
  // Paragraphs (double newline)
  html = html.replace(/\n\n/g, '</p><p class="text-gray-700 leading-relaxed mb-4">');
  html = '<p class="text-gray-700 leading-relaxed mb-4">' + html + '</p>';
  // Single newline -> br
  html = html.replace(/\n/g, '<br/>');
  // Clean up empty figcaptions
  html = html.replace(/<figcaption class="text-center text-sm text-gray-500 mt-2"><\/figcaption>/g, '');
  return html;
}

function estimateReadTime(content: string): number {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export default function ArticleDetailClient({ article }: { article: Article }) {
  const readTime = estimateReadTime(article.content);

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
                <Link href="/news" className="hover:text-blue-600">News</Link>
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
            <div
              className="prose prose-lg max-w-none"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(article.content) }}
            />
          </article>

          {/* Back to News */}
          <div className="border-t border-gray-200 py-8">
            <Link
              href="/news"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Back to News
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
