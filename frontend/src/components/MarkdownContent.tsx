import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { normalizeCompactTables } from '@/lib/normalize-markdown';

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export default function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  const components: Components = {
    h1: ({ children, id }) => <h2 id={id} className="mb-4 mt-10 text-2xl font-bold text-gray-900">{children}</h2>,
    h2: ({ children, id }) => <h2 id={id} className="mb-4 mt-10 text-xl font-bold text-gray-900">{children}</h2>,
    h3: ({ children, id }) => <h3 id={id} className="mb-3 mt-8 text-lg font-semibold text-gray-900">{children}</h3>,
    h4: ({ children, id }) => <h4 id={id} className="mb-2 mt-6 text-base font-semibold text-gray-900">{children}</h4>,
    h5: ({ children, id }) => <h5 id={id} className="mb-2 mt-5 text-sm font-semibold text-gray-900">{children}</h5>,
    h6: ({ children, id }) => <h6 id={id} className="mb-2 mt-5 text-sm font-semibold text-gray-900">{children}</h6>,
    p: ({ children }) => <p className="mb-4 leading-relaxed text-gray-700">{children}</p>,
    a: ({ href, children, id, title, ...props }) => {
      if (!href) return <>{children}</>;
      const external = /^https?:\/\//i.test(href);
      return <a aria-describedby={props['aria-describedby']} id={id} title={title} href={href} className="text-blue-600 underline hover:text-blue-800" {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
    },
    img: ({ src, alt }) => typeof src === 'string'
      ? <span className="my-6 block"><img src={src} alt={alt || ''} className="h-auto max-w-full rounded-lg shadow-sm" loading="lazy" />{alt ? <span className="mt-2 block text-center text-sm text-gray-500">{alt}</span> : null}</span>
      : null,
    ul: ({ children, className: markdownClassName }) => <ul className={`my-5 list-disc space-y-2 pl-6 text-gray-700 ${markdownClassName || ''}`}>{children}</ul>,
    ol: ({ children, className: markdownClassName, start }) => <ol start={start} className={`my-5 list-decimal space-y-2 pl-6 text-gray-700 ${markdownClassName || ''}`}>{children}</ol>,
    li: ({ children, id, className: markdownClassName }) => <li id={id} className={`pl-1 ${markdownClassName || ''}`}>{children}</li>,
    blockquote: ({ children }) => <blockquote className="my-4 border-l-4 border-blue-500 py-1 pl-4 italic text-gray-700">{children}</blockquote>,
    hr: () => <hr className="my-8 border-gray-200" />,
    del: ({ children }) => <del>{children}</del>,
    table: ({ children }) => <div className="my-6 w-full overflow-x-auto rounded-lg border border-gray-200"><table className="w-full border-collapse text-left text-sm">{children}</table></div>,
    thead: ({ children }) => <thead className="bg-gray-100 text-gray-900">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-gray-200">{children}</tbody>,
    tr: ({ children }) => <tr className="even:bg-gray-50">{children}</tr>,
    th: ({ children, style }) => <th style={style} scope="col" className="border-b border-gray-300 px-4 py-3 font-semibold">{children}</th>,
    td: ({ children, style }) => <td style={style} className="border-b border-gray-200 px-4 py-3 align-top text-gray-700">{children}</td>,
    pre: ({ children }) => <pre className="my-5 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100 [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit">{children}</pre>,
    code: ({ className: codeClassName, children }) => <code className={codeClassName ? `${codeClassName} font-mono` : 'rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-800'}>{children}</code>,
    input: ({ checked, disabled }) => <input disabled={disabled} type="checkbox" checked={Boolean(checked)} readOnly className="mr-2 align-middle accent-blue-600" />,
  };

  return <div className={className}>
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>{normalizeCompactTables(content)}</ReactMarkdown>
  </div>;
}
