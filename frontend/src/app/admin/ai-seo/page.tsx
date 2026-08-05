'use client';

import { Fragment, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, ChevronDownIcon, ChevronRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { AIAgentService, type AIAgentSEOJob } from '@/services/ai-agent.service';
import { useAdminI18n } from '@/lib/admin-i18n';

function statusStyle(status: AIAgentSEOJob['status']) {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-800';
  if (status === 'completed_with_errors') return 'bg-amber-100 text-amber-800';
  if (status === 'failed') return 'bg-rose-100 text-rose-800';
  if (status === 'cancelled') return 'bg-slate-200 text-slate-800';
  if (status === 'paused') return 'bg-orange-100 text-orange-800';
  if (status === 'running') return 'bg-violet-100 text-violet-800';
  return 'bg-slate-100 text-slate-700';
}

function statusLabel(status: AIAgentSEOJob['status'], zh: boolean) {
  const labels: Record<AIAgentSEOJob['status'], [string, string]> = {
    queued: ['已排队', 'Queued'],
    running: ['处理中', 'Running'],
    paused: ['已暂停', 'Paused'],
    cancelled: ['已结束', 'Ended'],
    completed: ['已完成', 'Completed'],
    completed_with_errors: ['完成（有失败）', 'Completed with errors'],
    failed: ['任务失败', 'Failed'],
  };
  return labels[status][zh ? 0 : 1];
}

export default function AISEORecordsPage() {
  const { locale, t } = useAdminI18n();
  const zh = locale === 'zh';
  const [expandedJob, setExpandedJob] = useState<AIAgentSEOJob | null>(null);
  const [loadingJobID, setLoadingJobID] = useState<string | null>(null);
  const [changingJobID, setChangingJobID] = useState<string | null>(null);
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery({
    queryKey: ['admin', 'ai-seo', 'stats'],
    queryFn: () => AIAgentService.getSEOStats(),
    refetchInterval: 5000,
  });
  const { data: jobs = [], isLoading: jobsLoading, refetch: refetchJobs } = useQuery({
    queryKey: ['admin', 'ai-seo', 'jobs'],
    queryFn: () => AIAgentService.listSEOJobs(),
    refetchInterval: 5000,
  });

  const reload = () => {
    void refetchStats();
    void refetchJobs();
    if (expandedJob) {
      void AIAgentService.getSEOJob(expandedJob.id).then(setExpandedJob).catch(() => undefined);
    }
  };

  const toggleDetails = async (job: AIAgentSEOJob) => {
    if (expandedJob?.id === job.id) {
      setExpandedJob(null);
      return;
    }
    setLoadingJobID(job.id);
    try {
      setExpandedJob(await AIAgentService.getSEOJob(job.id));
    } finally {
      setLoadingJobID(null);
    }
  };

  const changeJobState = async (job: AIAgentSEOJob) => {
    setChangingJobID(job.id);
    try {
      const updated = job.status === 'paused'
        ? await AIAgentService.resumeSEOJob(job.id)
        : await AIAgentService.pauseSEOJob(job.id);
      if (expandedJob?.id === updated.id) setExpandedJob(updated);
      await refetchJobs();
      void refetchStats();
      toast.success(job.status === 'paused'
        ? (zh ? 'AI SEO 任务已继续执行' : 'AI SEO job resumed')
        : (zh ? 'AI SEO 任务已暂停；已发出的请求可能会完成当前商品。' : 'AI SEO job paused. Requests already sent may finish their current product.'));
    } catch (error: unknown) {
      toast.error(error instanceof Error && error.message ? error.message : (zh ? '无法更新任务状态' : 'Unable to update job status'));
    } finally {
      setChangingJobID(null);
    }
  };

  const endPausedJob = async (job: AIAgentSEOJob) => {
    if (!window.confirm(zh
      ? `结束任务 ${job.id.slice(0, 8)}？已成功优化的产品会保留，尚未处理的 SKU 将从队列释放，可在以后重新优化。`
      : `End job ${job.id.slice(0, 8)}? Optimized products remain unchanged; unprocessed SKUs will be released for a future job.`)) return;
    setChangingJobID(job.id);
    try {
      const updated = await AIAgentService.endPausedSEOJob(job.id);
      if (expandedJob?.id === updated.id) setExpandedJob(updated);
      await refetchJobs();
      void refetchStats();
      toast.success(zh ? '已结束暂停的 AI SEO 任务，剩余 SKU 已释放。' : 'Paused AI SEO job ended and remaining SKUs released.');
    } catch (error: unknown) {
      toast.error(error instanceof Error && error.message ? error.message : (zh ? '结束任务失败' : 'Unable to end the job'));
    } finally {
      setChangingJobID(null);
    }
  };

  const cards = [
    { label: zh ? '全部产品' : 'All products', value: stats?.total, style: 'border-slate-200 bg-slate-50 text-slate-950', href: '/admin/products' },
    { label: zh ? 'AI 已优化' : 'AI optimized', value: stats?.optimized, style: 'border-emerald-200 bg-emerald-50 text-emerald-950', href: '/admin/products?aiSeoStatus=optimized' },
    { label: zh ? '未 AI 优化' : 'Not AI optimized', value: stats?.not_optimized, style: 'border-gray-200 bg-gray-50 text-gray-950', href: '/admin/products?aiSeoStatus=not_optimized' },
    { label: zh ? 'AI 处理中' : 'AI processing', value: stats?.running, style: 'border-violet-200 bg-violet-50 text-violet-950', href: '/admin/products?aiSeoStatus=running' },
    { label: zh ? 'AI 优化失败' : 'AI failed', value: stats?.failed, style: 'border-rose-200 bg-rose-50 text-rose-950', href: '/admin/products?aiSeoStatus=failed' },
  ];

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-7 text-white shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3">
              <SparklesIcon className="mt-0.5 h-7 w-7 shrink-0" />
              <div>
                <h1 className="text-2xl font-bold">{t('nav.aiSeo', zh ? 'AI SEO 优化记录' : 'AI SEO Records')}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-100">
                  {zh ? '这里记录产品页手动勾选和“自动候选优化”创建的 AI SEO 任务。可暂停、继续，或结束已暂停任务并释放其剩余 SKU。' : 'This page records AI SEO jobs created from explicit selections and automatic candidate batches. You can pause, resume, or end a paused job and release its remaining SKUs.'}
                </p>
              </div>
            </div>
            <Link href="/admin/products" className="inline-flex shrink-0 items-center justify-center rounded-lg bg-white px-4 py-2 text-sm font-semibold text-violet-700 shadow-sm hover:bg-violet-50">{zh ? '前往产品列表优化' : 'Optimize products'}</Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {cards.map((card) => (
            <Link key={card.href} href={card.href} className={`rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${card.style}`}>
              <div className="text-sm font-medium">{card.label}</div>
              <div className="mt-2 text-3xl font-bold">{statsLoading ? '—' : (card.value ?? 0).toLocaleString()}</div>
              <div className="mt-2 text-xs opacity-70">{zh ? '点击筛选产品' : 'Click to filter products'}</div>
            </Link>
          ))}
        </section>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{zh ? '最近 50 个 AI SEO 任务' : 'Most recent 50 AI SEO jobs'}</h2>
              <p className="mt-1 text-sm text-gray-500">{zh ? '展开任务可查看每个 SKU 的处理结果与失败原因。结束仅对已暂停任务开放：已优化内容保留，未处理 SKU 会释放。' : 'Expand a job to inspect each SKU result and any failure reason. End is available only for paused jobs: optimized content stays and unprocessed SKUs are released.'}</p>
            </div>
            <button type="button" onClick={reload} className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"><ArrowPathIcon className="h-4 w-4" />{zh ? '刷新' : 'Refresh'}</button>
          </div>
          {jobsLoading ? (
            <div className="p-12 text-center text-sm text-gray-500">{zh ? '正在加载 AI SEO 任务…' : 'Loading AI SEO jobs…'}</div>
          ) : jobs.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-500"><p>{zh ? '暂时还没有 AI SEO 任务。' : 'There are no AI SEO jobs yet.'}</p><Link href="/admin/products" className="mt-3 inline-block font-medium text-violet-700 hover:text-violet-900">{zh ? '去产品列表选择商品' : 'Select products in the product list'}</Link></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500"><tr><th className="w-10 px-4 py-3" /><th className="px-4 py-3">{zh ? '创建时间 / 任务' : 'Created / job'}</th><th className="min-w-72 px-4 py-3">{zh ? '提示词' : 'Instruction'}</th><th className="px-4 py-3">{zh ? '进度' : 'Progress'}</th><th className="px-4 py-3">{zh ? '成功 / 失败' : 'Success / failed'}</th><th className="px-4 py-3">{zh ? '状态' : 'Status'}</th><th className="px-4 py-3">{zh ? '操作' : 'Action'}</th></tr></thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {jobs.map((job) => <Fragment key={job.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3"><button type="button" onClick={() => void toggleDetails(job)} className="rounded p-1 text-gray-500 hover:bg-gray-200" aria-label={zh ? '查看任务详情' : 'View job details'}>{loadingJobID === job.id ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : expandedJob?.id === job.id ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}</button></td>
                      <td className="px-4 py-3"><div className="whitespace-nowrap text-gray-900">{new Date(job.created_at).toLocaleString()}</div><div className="mt-1 flex items-center gap-2"><span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${job.selection_mode === 'auto_failed' ? 'bg-rose-100 text-rose-800' : job.selection_mode === 'auto_candidates' ? 'bg-fuchsia-100 text-fuchsia-800' : 'bg-slate-100 text-slate-700'}`}>{job.selection_mode === 'auto_failed' ? (zh ? '失败重试' : 'Failed retry') : job.selection_mode === 'auto_candidates' ? (zh ? '自动候选' : 'Auto candidates') : (zh ? '手动选择' : 'Selected')}</span><span className="font-mono text-xs text-gray-400">{job.id}</span></div></td>
                      <td className="max-w-md px-4 py-3 text-gray-700"><p className="line-clamp-2">{job.prompt}</p>{job.error && <p className="mt-1 line-clamp-1 text-xs text-rose-700">{job.error}</p>}</td>
                      <td className="px-4 py-3"><div className="whitespace-nowrap font-medium text-gray-900">{job.processed}/{job.total}</div><div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-violet-600" style={{ width: `${job.total ? Math.min(100, Math.round((job.processed / job.total) * 100)) : 0}%` }} /></div></td>
                      <td className="whitespace-nowrap px-4 py-3"><span className="font-medium text-emerald-700">{job.succeeded}</span><span className="text-gray-400"> / </span><span className={job.failed ? 'font-medium text-rose-700' : 'text-gray-600'}>{job.failed}</span></td>
                      <td className="whitespace-nowrap px-4 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyle(job.status)}`}>{statusLabel(job.status, zh)}</span></td>
                      <td className="whitespace-nowrap px-4 py-3">{(job.status === 'queued' || job.status === 'running') && <button type="button" onClick={() => void changeJobState(job)} disabled={changingJobID !== null} className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50">{changingJobID === job.id ? (zh ? '处理中…' : 'Working…') : (zh ? '暂停' : 'Pause')}</button>}{job.status === 'paused' && <div className="flex items-center gap-2"><button type="button" onClick={() => void changeJobState(job)} disabled={changingJobID !== null} className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50">{changingJobID === job.id ? (zh ? '处理中…' : 'Working…') : (zh ? '继续' : 'Resume')}</button><button type="button" onClick={() => void endPausedJob(job)} disabled={changingJobID !== null} className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50">{changingJobID === job.id ? (zh ? '处理中…' : 'Working…') : (zh ? '结束' : 'End')}</button></div>}</td>
                    </tr>
                    {expandedJob?.id === job.id && <tr className="bg-violet-50/40"><td colSpan={7} className="px-5 py-4"><div className="rounded-lg border border-violet-100 bg-white"><div className="border-b border-violet-100 px-4 py-3 text-sm font-semibold text-gray-900">{zh ? 'SKU 处理明细' : 'SKU processing details'}</div><div className="max-h-80 overflow-auto"><table className="min-w-full text-sm"><thead className="sticky top-0 bg-violet-50 text-left text-xs text-violet-800"><tr><th className="px-4 py-2">SKU</th><th className="px-4 py-2">{zh ? '产品 ID' : 'Product ID'}</th><th className="px-4 py-2">{zh ? '结果' : 'Result'}</th><th className="px-4 py-2">{zh ? '失败原因' : 'Failure reason'}</th></tr></thead><tbody className="divide-y divide-gray-100">{(expandedJob.items || []).map((item) => <tr key={item.id}><td className="px-4 py-2 font-mono text-gray-900">{item.sku}</td><td className="px-4 py-2"><Link href={`/admin/products/${item.product_id}/edit`} className="text-violet-700 hover:underline">#{item.product_id}</Link></td><td className="px-4 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.status === 'optimized' ? 'bg-emerald-100 text-emerald-800' : item.status === 'failed' ? 'bg-rose-100 text-rose-800' : item.status === 'cancelled' ? 'bg-slate-200 text-slate-800' : item.status === 'running' ? 'bg-violet-100 text-violet-800' : 'bg-gray-100 text-gray-700'}`}>{item.status}</span></td><td className="max-w-xl px-4 py-2 text-xs text-rose-700">{item.error || '—'}</td></tr>)}</tbody></table></div></div></td></tr>}
                  </Fragment>)}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
