'use client';

import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { ArrowPathIcon, SparklesIcon } from '@heroicons/react/24/outline';

import { AIAgentService, type AIAgentArticleDraft } from '@/services/ai-agent.service';
import { useAdminI18n } from '@/lib/admin-i18n';

type Props = {
  contentType: 'news' | 'blog';
  onApply: (draft: AIAgentArticleDraft) => void;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
}

export default function AIArticleWriter({ contentType, onApply }: Props) {
  const { locale } = useAdminI18n();
  const zh = locale === 'zh';
  const [topic, setTopic] = useState('');
  const [keywords, setKeywords] = useState('');
  const [language, setLanguage] = useState(zh ? 'zh-CN' : 'en');
  const [tone, setTone] = useState(zh ? '专业、清晰、面向采购和工程师' : 'Professional, practical, and clear');
  const [outline, setOutline] = useState('');
  const [generating, setGenerating] = useState(false);

  const generate = async () => {
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length < 3) {
      toast.error(zh ? '请先输入文章主题' : 'Enter an article topic first');
      return;
    }
    setGenerating(true);
    try {
      const draft = await AIAgentService.generateArticleDraft({
        topic: trimmedTopic,
        keywords: keywords.trim(),
        language,
        content_type: contentType,
        tone: tone.trim(),
        outline: outline.trim(),
      });
      onApply(draft);
      toast.success(zh ? 'AI 草稿已填入表单，请审核后保存' : 'AI draft inserted. Review it before saving.');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || (zh ? 'AI 暂时无法生成文章' : 'AI could not generate the article'));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <section className="rounded-lg border border-violet-200 bg-violet-50/60 p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-2">
          <SparklesIcon className="mt-0.5 h-5 w-5 text-violet-700" />
          <div>
            <h2 className="text-sm font-semibold text-violet-950">{zh ? 'AI 文章草稿' : 'AI article draft'}</h2>
            <p className="mt-1 text-xs leading-5 text-violet-800">
              {zh ? '生成结果只会填入当前表单，不会自动保存或发布。' : 'The result is inserted into this form only. It is never saved or published automatically.'}
            </p>
          </div>
        </div>
        <span className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-[11px] font-medium text-violet-700">
          {contentType === 'blog' ? 'BLOG' : 'NEWS'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-gray-700">{zh ? '主题' : 'Topic'} *</span>
          <input value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={500} className="w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" placeholder={zh ? '例如：如何判断 FANUC 伺服放大器是否需要维修' : 'For example: How to assess a FANUC servo amplifier for repair'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-700">{zh ? '关键词' : 'Keywords'}</span>
          <input value={keywords} onChange={(event) => setKeywords(event.target.value)} maxLength={800} className="w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" placeholder={zh ? '用逗号分隔' : 'Comma separated'} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-gray-700">{zh ? '语言' : 'Language'}</span>
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200">
            <option value="en">English</option>
            <option value="zh-CN">简体中文</option>
            <option value="de">Deutsch</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-gray-700">{zh ? '语气' : 'Tone'}</span>
          <input value={tone} onChange={(event) => setTone(event.target.value)} maxLength={120} className="w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs font-semibold text-gray-700">{zh ? '重点或大纲（可选）' : 'Focus or outline (optional)'}</span>
          <textarea value={outline} onChange={(event) => setOutline(event.target.value)} maxLength={1500} rows={3} className="w-full rounded-md border border-violet-200 bg-white px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-200" placeholder={zh ? '例如：故障现象、检查步骤、询价时需要提供的信息' : 'For example: symptoms, inspection steps, and details to include in a quote request'} />
        </label>
      </div>

      <div className="mt-4 flex justify-end">
        <button type="button" onClick={generate} disabled={generating || topic.trim().length < 3} className="inline-flex items-center gap-2 rounded-md bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
          <ArrowPathIcon className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? (zh ? '生成中...' : 'Generating...') : (zh ? '生成并填入草稿' : 'Generate draft')}
        </button>
      </div>
    </section>
  );
}
