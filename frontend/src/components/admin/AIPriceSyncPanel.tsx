'use client';

import { ChangeEvent, useRef, useState } from 'react';
import {
  ArrowUpTrayIcon,
  CheckCircleIcon,
  CurrencyDollarIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import {
  AIAgentPricePreview,
  AIAgentPricePreviewRow,
  AIAgentService,
} from '@/services/ai-agent.service';

const PRICE_TEXT_LIMIT = 4000;

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown; response?: { data?: { error?: unknown; message?: unknown } } };
    const detail = candidate.response?.data?.error || candidate.response?.data?.message || candidate.message;
    if (typeof detail === 'string') return detail;
  }
  return '';
}

function rowStatus(row: AIAgentPricePreviewRow, zh: boolean) {
  const labels: Record<AIAgentPricePreviewRow['status'], [string, string]> = {
    matched: ['已匹配', 'Matched'],
    unmatched: ['未匹配', 'Unmatched'],
    ambiguous: ['匹配不唯一', 'Ambiguous'],
    conflict: ['价格冲突', 'Price conflict'],
    invalid: ['格式无效', 'Invalid'],
    duplicate: ['重复行', 'Duplicate'],
  };
  return labels[row.status]?.[zh ? 0 : 1] || row.status;
}

export default function AIPriceSyncPanel({ zh }: { zh: boolean }) {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<AIAgentPricePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const characterCount = Array.from(text).length;

  const updateText = (value: string) => {
    setText(Array.from(value).slice(0, PRICE_TEXT_LIMIT).join(''));
    setPreview(null);
    setApplied(false);
  };

  const importTextFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const value = await file.text();
      if (Array.from(value).length > PRICE_TEXT_LIMIT) {
        toast.error(zh ? `文件内容超过 ${PRICE_TEXT_LIMIT} 字符上限` : `File content exceeds the ${PRICE_TEXT_LIMIT}-character limit`);
        return;
      }
      updateText(value);
    } catch {
      toast.error(zh ? '无法读取价格文件' : 'Could not read the price file');
    }
  };

  const createPreview = async () => {
    const value = text.trim();
    if (value.length < 2 || previewing) return;
    setPreviewing(true);
    try {
      setPreview(await AIAgentService.previewPrices(value));
      setApplied(false);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (zh ? '价格表匹配失败' : 'Could not match the price list'));
    } finally {
      setPreviewing(false);
    }
  };

  const applyMatchedPrices = async () => {
    if (!preview?.suggestions.length || applying || applied) return;
    setApplying(true);
    try {
      await AIAgentService.apply(preview.suggestions);
      setApplied(true);
      toast.success(zh ? `已同步 ${preview.suggestions.length} 个商品价格` : `Synchronized ${preview.suggestions.length} product prices`);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (zh ? '价格同步失败' : 'Could not synchronize prices'));
    } finally {
      setApplying(false);
    }
  };

  const issueRows = preview?.rows.filter((row) => row.status !== 'matched') || [];

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-50">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <div className="rounded-lg border border-gray-200 bg-white p-3">
          <label htmlFor="ai-price-list" className="block text-xs font-semibold text-gray-700">
            {zh ? '型号与售价' : 'Models and sale prices'}
          </label>
          <textarea
            id="ai-price-list"
            value={text}
            onChange={(event) => updateText(event.target.value)}
            maxLength={PRICE_TEXT_LIMIT}
            rows={8}
            placeholder={zh ? '型号 价格$\n型号 = 价格 USD' : 'MODEL PRICE$\nMODEL = PRICE USD'}
            className="mt-2 w-full resize-y rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-xs leading-5 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
          />
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[11px] text-gray-500">{characterCount}/{PRICE_TEXT_LIMIT}</span>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain"
                onChange={importTextFile}
                className="sr-only"
                aria-label={zh ? '导入价格文件' : 'Import price file'}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                title={zh ? '导入 CSV、TSV 或 TXT' : 'Import CSV, TSV, or TXT'}
              >
                <ArrowUpTrayIcon className="h-4 w-4" />
                {zh ? '导入' : 'Import'}
              </button>
              <button
                type="button"
                onClick={() => void createPreview()}
                disabled={previewing || text.trim().length < 2}
                className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
                {previewing ? (zh ? '匹配中...' : 'Matching...') : (zh ? '匹配预览' : 'Match preview')}
              </button>
            </div>
          </div>
        </div>

        {preview && (
          <>
            <div className="grid grid-cols-3 gap-2" aria-label={zh ? '价格匹配统计' : 'Price match summary'}>
              <div className="border-l-2 border-emerald-500 bg-white px-2 py-2"><p className="text-lg font-bold text-emerald-700">{preview.matched}</p><p className="text-[11px] text-gray-500">{zh ? '可同步' : 'Matched'}</p></div>
              <div className="border-l-2 border-amber-500 bg-white px-2 py-2"><p className="text-lg font-bold text-amber-700">{preview.unmatched + preview.ambiguous}</p><p className="text-[11px] text-gray-500">{zh ? '需核对' : 'Review'}</p></div>
              <div className="border-l-2 border-rose-500 bg-white px-2 py-2"><p className="text-lg font-bold text-rose-700">{preview.conflicts + preview.invalid}</p><p className="text-[11px] text-gray-500">{zh ? '不可应用' : 'Blocked'}</p></div>
            </div>

            {preview.rows.filter((row) => row.status === 'matched').length > 0 && (
              <div className="space-y-2">
                {preview.rows.filter((row) => row.status === 'matched').map((row) => (
                  <div key={`matched-${row.line}`} className="flex items-center justify-between gap-3 border-b border-gray-200 bg-white px-3 py-2 text-xs last:border-b-0">
                    <div className="min-w-0"><p className="truncate font-semibold text-gray-900">{row.sku || row.model}</p><p className="truncate text-gray-500">{row.product_name || row.model}</p></div>
                    <div className="shrink-0 text-right"><p className="font-semibold text-emerald-700">{row.current_price} → {row.price}{row.currency ? ` ${row.currency}` : ''}</p><p className="text-[10px] text-gray-400">{zh ? `第 ${row.line} 行` : `Line ${row.line}`}</p></div>
                  </div>
                ))}
              </div>
            )}

            {issueRows.length > 0 && (
              <div className="space-y-1.5">
                {issueRows.map((row) => (
                  <div key={`issue-${row.line}`} className="border-l-2 border-amber-400 bg-white px-3 py-2 text-xs">
                    <div className="flex items-center justify-between gap-2"><span className="truncate font-semibold text-gray-800">{row.model}</span><span className="shrink-0 text-amber-700">{rowStatus(row, zh)}</span></div>
                    <p className="mt-0.5 text-[11px] text-gray-500">{zh ? `第 ${row.line} 行` : `Line ${row.line}`}{row.message ? ` · ${row.message}` : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="border-t border-gray-200 bg-white p-3">
        <button
          type="button"
          onClick={() => void applyMatchedPrices()}
          disabled={!preview?.suggestions.length || applying || applied}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {applied ? <CheckCircleIcon className="h-5 w-5" /> : <CurrencyDollarIcon className="h-5 w-5" />}
          {applied
            ? (zh ? '价格已同步' : 'Prices synchronized')
            : applying
              ? (zh ? '正在同步...' : 'Synchronizing...')
              : (zh ? `确认同步 ${preview?.suggestions.length || 0} 个价格` : `Confirm ${preview?.suggestions.length || 0} price updates`)}
        </button>
      </div>
    </div>
  );
}
