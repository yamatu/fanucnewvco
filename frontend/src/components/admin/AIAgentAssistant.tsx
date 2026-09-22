'use client';

import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import {
  ArrowPathIcon,
  BookmarkIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import {
  AIAgentAction,
  AI_AGENT_CONFIG_CHANGED_EVENT,
  AIAgentMessage,
  AIAgentReply,
  AIAgentService,
  AIAgentStatus,
  AIAgentStreamStep,
} from '@/services/ai-agent.service';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAdminI18n } from '@/lib/admin-i18n';
import AIPriceSyncPanel from '@/components/admin/AIPriceSyncPanel';
import AIPromptLibrary from '@/components/admin/AIPromptLibrary';

const SUGGESTED_PROMPTS = [
  '批量入库（把型号列表贴在下面，每个型号一行）：\nA06B-XXXX\nA06B-YYYY',
  '检查 SKU A06B-XXXX 的分类是否正确，并给出 SEO 优化建议',
  '为 FANUC 伺服驱动分类生成中文、德语 SEO 内容',
  '列出未分类的商品，并启动分类任务把缺失的分类按核验结果自动创建',
];

// Shell-style input recall. The list is mirrored into localStorage so a pasted
// model list is still one ArrowUp away after a page reload.
const INPUT_HISTORY_KEY = 'vcocncspare.ai-assistant.input-history';
const INPUT_HISTORY_LIMIT = 100;

const actionLabels: Record<string, { zh: string; en: string }> = {
  create_category: { zh: '创建新分类', en: 'Create category' },
  assign_product_category: { zh: '商品归类调整', en: 'Product category assignment' },
  start_category_optimization: { zh: '批量分类优化任务', en: 'Bulk category optimization task' },
  create_product: { zh: '新建产品草稿', en: 'New product draft' },
  update_product: { zh: '商品分类 / SEO 优化', en: 'Product category / SEO update' },
  update_product_price: { zh: '商品售价修改', en: 'Product sale price update' },
  upsert_product_translation: { zh: '商品多语言 SEO', en: 'Product multilingual SEO' },
  upsert_category_translation: { zh: '分类多语言 SEO', en: 'Category multilingual SEO' },
};

// Mirrors the read-only tools the Go backend exposes to the assistant. The
// trace is shown so an administrator can see which catalogue data an answer was
// actually based on instead of trusting an unattributed claim.
const toolLabels: Record<string, { zh: string; en: string }> = {
  search_products: { zh: '检索商品', en: 'Searched products' },
  get_product: { zh: '读取商品', en: 'Read product' },
  list_categories: { zh: '读取分类', en: 'Listed categories' },
  count_products: { zh: '统计商品', en: 'Counted products' },
  seo_gap_report: { zh: 'SEO 缺口统计', en: 'SEO gap report' },
  list_uncategorized_products: { zh: '查询未分类商品', en: 'Listed uncategorized products' },
  assign_product_category: { zh: '分类调整建议', en: 'Category assignment proposal' },
  create_category: { zh: '创建分类建议', en: 'Category creation proposal' },
  start_category_optimization: { zh: '分类任务建议', en: 'Category task proposal' },
};

// Streaming chat state for the in-flight run. It becomes the completed
// message's step timeline once the final proposal arrives.
type LiveAssistantState = {
  stage: string;
  steps: AIAgentStreamStep[];
  notes: string[];
  text: string;
};

const emptyLiveState = (): LiveAssistantState => ({ stage: 'thinking', steps: [], notes: [], text: '' });

function formatStepDuration(durationMs: number) {
  if (durationMs >= 1000) return `${(durationMs / 1000).toFixed(1)}s`;
  return `${durationMs}ms`;
}

function StepStatusIcon({ status }: { status: AIAgentStreamStep['status'] }) {
  if (status === 'ok') return <CheckCircleIcon className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />;
  if (status === 'error') return <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0 text-amber-600" aria-hidden="true" />;
  return <ArrowPathIcon className="h-3.5 w-3.5 shrink-0 animate-spin text-violet-500" aria-hidden="true" />;
}

// One line per tool execution with status and duration, mirroring the live
// agent run the backend reports through the streaming endpoint.
function AssistantSteps({ steps, zh }: { steps: AIAgentStreamStep[]; zh: boolean }) {
  if (steps.length === 0) return null;
  return (
    <ul className="mb-1.5 space-y-0.5 border-b border-slate-100 pb-1.5 text-[11px] leading-5" aria-label={zh ? '执行步骤' : 'Execution steps'}>
      {steps.map((step) => (
        <li key={step.id} className="flex items-center gap-1.5 text-slate-500">
          <StepStatusIcon status={step.status} />
          <span className={`shrink-0 font-medium ${step.status === 'error' ? 'text-amber-700' : 'text-slate-600'}`}>
            {toolLabels[step.tool]?.[zh ? 'zh' : 'en'] || step.tool}
          </span>
          {step.detail && <span className="truncate text-slate-400">{step.detail}</span>}
          {step.status === 'running' && <span className="shrink-0 text-violet-500">{zh ? '执行中…' : 'running…'}</span>}
          {step.status === 'ok' && <span className="shrink-0 text-slate-400">{formatStepDuration(step.duration_ms ?? 0)}</span>}
          {step.status === 'error' && step.error && <span className="truncate text-amber-600">{step.error}</span>}
        </li>
      ))}
    </ul>
  );
}

// Answers are rendered as Markdown. react-markdown never injects raw HTML, so
// model output stays inert; the components map keeps the typography compact
// inside the chat bubble.
const markdownComponents: Components = {
  h1: ({ children }) => <h3 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h3>,
  h2: ({ children }) => <h4 className="mb-1 mt-3 text-sm font-semibold first:mt-0">{children}</h4>,
  h3: ({ children }) => <h5 className="mb-1 mt-2 text-xs font-semibold first:mt-0">{children}</h5>,
  h4: ({ children }) => <h5 className="mb-1 mt-2 text-xs font-semibold first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-1.5 list-disc space-y-0.5 pl-5 first:mt-0 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="my-1.5 list-decimal space-y-0.5 pl-5 first:mt-0 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-5">{children}</li>,
  code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px] text-slate-800">{children}</code>,
  pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-md bg-slate-900 p-2 font-mono text-[11px] leading-4 text-slate-100">{children}</pre>,
  a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-violet-700 underline">{children}</a>,
  table: ({ children }) => <div className="my-2 overflow-x-auto"><table className="w-full border-collapse text-[11px]">{children}</table></div>,
  th: ({ children }) => <th className="border border-slate-200 bg-slate-50 px-1.5 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-slate-200 px-1.5 py-1 align-top">{children}</td>,
  blockquote: ({ children }) => <blockquote className="my-1.5 border-l-2 border-slate-300 pl-2 text-slate-600">{children}</blockquote>,
  hr: () => <hr className="my-2 border-slate-200" />,
};

function MarkdownBlock({ content }: { content: string }) {
  return (
    <div className="ai-markdown break-words">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const candidate = error as { message?: unknown; response?: { data?: { error?: unknown; message?: unknown } } };
    const dataMessage = candidate.response?.data?.error || candidate.response?.data?.message;
    if (typeof dataMessage === 'string' && dataMessage) return dataMessage;
    if (typeof candidate.message === 'string' && candidate.message) return candidate.message;
  }
  return '';
}

function actionSummary(action: AIAgentAction, zh: boolean) {
  const d = action.data || {};
  switch (action.type) {
    case 'create_category':
      return zh
        ? `创建分类「${displayValue(d.brand)} > ${displayValue(d.product_type)}」${d.new_type ? '（新类型：将创建公开分类节点，请确认名称）' : ''}`
        : `Create category “${displayValue(d.brand)} > ${displayValue(d.product_type)}”${d.new_type ? ' (new type — a public category node will be created)' : ''}`;
    case 'assign_product_category':
      return zh
        ? `商品「${displayValue(d.product_sku || d.product_id)}」归入分类「${displayValue(d.category_path || d.category_id)}」`
        : `Move product “${displayValue(d.product_sku || d.product_id)}” into “${displayValue(d.category_path || d.category_id)}”`;
    case 'start_category_optimization': {
      const count = displayValue(d.product_count);
      const scopeLabels: Record<string, { zh: string; en: string }> = {
        uncategorized: { zh: `全部未分类商品（${count} 个）`, en: `all uncategorized products (${count})` },
        brand: { zh: `品牌「${displayValue(d.brand)}」的商品`, en: `products of brand “${displayValue(d.brand)}”` },
        rework: { zh: '按分类审计处理的待返修商品', en: 'products from the classification audit' },
        products: { zh: `指定的 ${count} 个商品`, en: `${count} selected products` },
      };
      const scopeLabel = scopeLabels[String(d.scope)] || { zh: '商品', en: 'products' };
      return zh
        ? `启动后台分类任务：${scopeLabel.zh}；系统联网核验品牌/型号后归类，缺失分类会自动创建`
        : `Start the background category task for ${scopeLabel.en}; brands/types are web-verified and missing categories are created automatically`;
    }
    case 'create_product':
      return zh
        ? `创建未发布产品「${displayValue(d.name || d.model)}」；售价 ${displayValue(d.default_price)} USD，质保 ${displayValue(d.warranty_period)}，交期 ${displayValue(d.lead_time)}`
        : `Create unpublished product “${displayValue(d.name || d.model)}”; price ${displayValue(d.default_price)} USD, warranty ${displayValue(d.warranty_period)}, lead time ${displayValue(d.lead_time)}`;
    case 'update_product':
      return zh
        ? `商品 #${displayValue(d.product_id)}：建议归入「${displayValue(d.category_name || d.category_id || d.category_client_key)}」并优化 SEO`
        : `Product #${displayValue(d.product_id)}: move to “${displayValue(d.category_name || d.category_id || d.category_client_key)}” and optimize SEO`;
    case 'update_product_price':
      return zh
        ? `商品 #${displayValue(d.product_id)}：型号「${displayValue(d.matching_model)}」售价 ${displayValue(d.current_price)} → ${displayValue(d.sale_price)}${d.currency ? ` ${displayValue(d.currency)}` : ''}`
        : `Product #${displayValue(d.product_id)}: model “${displayValue(d.matching_model)}” sale price ${displayValue(d.current_price)} → ${displayValue(d.sale_price)}${d.currency ? ` ${displayValue(d.currency)}` : ''}`;
    case 'upsert_product_translation':
      return zh
        ? `商品 #${displayValue(d.product_id)} · ${displayValue(d.language_code)} SEO`
        : `Product #${displayValue(d.product_id)} · ${displayValue(d.language_code)} SEO`;
    case 'upsert_category_translation':
      return zh
        ? `分类 #${displayValue(d.category_id)} · ${displayValue(d.language_code)} SEO`
        : `Category #${displayValue(d.category_id)} · ${displayValue(d.language_code)} SEO`;
    default:
      return action.title;
  }
}

function ProposalCard({ action, onApply, applying, applied, requiresBatch }: {
  action: AIAgentAction;
  onApply: () => void;
  applying: boolean;
  applied: boolean;
  requiresBatch: boolean;
}) {
  const { locale } = useAdminI18n();
  const [expanded, setExpanded] = useState(false);
  const zh = locale === 'zh';
  const label = actionLabels[action.type]?.[zh ? 'zh' : 'en'] || action.title;
  const newTypeProposal = action.type === 'create_category' && Boolean(action.data?.new_type);
  const entries = Object.entries(action.data || {}).filter(([key]) => key !== 'client_key' && key !== 'category_client_key' && key !== 'new_type' && key !== 'allow_new_product_types');

  return (
    <article className="rounded-lg border border-violet-200 bg-violet-50/60 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-violet-950">{label}</p>
          <p className="mt-0.5 text-xs leading-5 text-violet-800">{action.title || actionSummary(action, zh)}</p>
        </div>
        {applied ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-700">
            <CheckCircleIcon className="h-4 w-4" /> {zh ? '已应用' : 'Applied'}
          </span>
        ) : newTypeProposal ? (
          <span className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800">
            {zh ? '将创建新类型' : 'New type'}
          </span>
        ) : requiresBatch ? (
          <span className="shrink-0 rounded-md border border-violet-200 bg-white px-2 py-1 text-[10px] font-medium text-violet-700">
            {zh ? '随整组应用' : 'Apply as group'}
          </span>
        ) : (
          <button
            type="button"
            disabled={applying}
            onClick={onApply}
            className="shrink-0 rounded-md bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {applying
              ? (zh ? '应用中...' : 'Applying...')
              : action.type === 'start_category_optimization'
                ? (zh ? '启动任务' : 'Start task')
                : (zh ? '应用' : 'Apply')}
          </button>
        )}
      </div>
      <p className="mt-2 text-xs text-gray-700">{actionSummary(action, zh)}</p>
      {entries.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-violet-700 hover:text-violet-900"
          >
            {expanded ? (zh ? '收起优化详情' : 'Hide optimized fields') : (zh ? '查看优化详情' : 'View optimized fields')}
            <ChevronDownIcon className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
          {expanded && (
            <dl className="mt-2 space-y-1.5 border-t border-violet-200 pt-2">
              {entries.map(([key, value]) => (
                <div key={key} className="grid grid-cols-[105px_minmax(0,1fr)] gap-2">
                  <dt className="break-words text-[11px] font-medium text-gray-500">{key}</dt>
                  <dd className="break-words whitespace-pre-wrap text-[11px] leading-4 text-gray-800">{displayValue(value)}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </article>
  );
}

export default function AIAgentAssistant() {
  const { locale } = useAdminI18n();
  const zh = locale === 'zh';
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'assistant' | 'prices'>('assistant');
  const [status, setStatus] = useState<AIAgentStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [messages, setMessages] = useState<AIAgentMessage[]>([]);
  const [input, setInput] = useState('');
  const [promptLibraryOpen, setPromptLibraryOpen] = useState(false);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [historyDraft, setHistoryDraft] = useState('');
  const historyHydratedRef = useRef(false);
  const [sending, setSending] = useState(false);
  const [applyingKey, setApplyingKey] = useState<string | null>(null);
  const [appliedKeys, setAppliedKeys] = useState<string[]>([]);
  const [live, setLive] = useState<LiveAssistantState | null>(null);
  const liveRef = useRef<LiveAssistantState | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Streaming state mirrors the in-flight run so it can become the completed
  // message (including its step timeline) once the final proposal arrives.
  const updateLive = (mutate: (current: LiveAssistantState) => LiveAssistantState) => {
    if (!liveRef.current) return;
    liveRef.current = mutate(liveRef.current);
    setLive(liveRef.current);
  };

  useEffect(() => {
    if (!open || status) return;
    setStatusLoading(true);
    AIAgentService.status()
      .then(setStatus)
      .catch((error: unknown) => toast.error(errorMessage(error) || (zh ? '无法读取 AI 设置' : 'Could not load AI settings')))
      .finally(() => setStatusLoading(false));
  }, [open, status, zh]);

  useEffect(() => {
    const refreshStatus = () => setStatus(null);
    window.addEventListener(AI_AGENT_CONFIG_CHANGED_EVENT, refreshStatus);
    return () => window.removeEventListener(AI_AGENT_CONFIG_CHANGED_EVENT, refreshStatus);
  }, []);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending, open, live]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(INPUT_HISTORY_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      if (Array.isArray(parsed)) {
        setInputHistory(parsed.filter((item): item is string => typeof item === 'string').slice(-INPUT_HISTORY_LIMIT));
      }
    } catch {
      // A corrupt cache must never keep the assistant from opening.
    }
    historyHydratedRef.current = true;
  }, []);

  useEffect(() => {
    if (!historyHydratedRef.current) return;
    try {
      window.localStorage.setItem(INPUT_HISTORY_KEY, JSON.stringify(inputHistory));
    } catch {
      // Private mode or a full quota: recall simply stays session-only.
    }
  }, [inputHistory]);

  // Enter sends and Shift+Enter inserts a newline; both keys are ignored while
  // an IME composition is being committed (Chinese input).
  // Walks the recall list. Returns true when the arrow key was consumed, so a
  // multi-line draft keeps its normal caret movement.
  const recallInputHistory = (direction: -1 | 1) => {
    if (inputHistory.length === 0) return false;
    if (direction === -1) {
      const next = historyCursor === null ? inputHistory.length - 1 : Math.max(0, historyCursor - 1);
      if (historyCursor === null) setHistoryDraft(input);
      setHistoryCursor(next);
      setInput(inputHistory[next]);
      return true;
    }
    if (historyCursor === null) return false;
    if (historyCursor >= inputHistory.length - 1) {
      setHistoryCursor(null);
      setInput(historyDraft);
      return true;
    }
    const next = historyCursor + 1;
    setHistoryCursor(next);
    setInput(inputHistory[next]);
    return true;
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      const target = event.currentTarget;
      const singleLine = !target.value.includes('\n');
      const caretAtStart = target.selectionStart === 0 && target.selectionEnd === 0;
      const caretAtEnd = target.selectionStart === target.value.length && target.selectionEnd === target.value.length;
      if (event.key === 'ArrowUp') {
        if (!singleLine && !caretAtStart) return;
        if (recallInputHistory(-1)) event.preventDefault();
      } else {
        if (!singleLine && !caretAtEnd) return;
        if (recallInputHistory(1)) event.preventDefault();
      }
      return;
    }
    if (event.key !== 'Enter' || event.shiftKey) return;
    event.preventDefault();
    void send();
  };

  const send = async (event?: FormEvent, suggested?: string) => {
    event?.preventDefault();
    const text = (suggested || input).trim();
    if (!text || sending || !status?.configured) return;
    const userMessage: AIAgentMessage = { role: 'user', content: text };
    setMessages((previous) => [...previous, userMessage]);
    setInput('');
    setInputHistory((previous) => (previous[previous.length - 1] === text ? previous : [...previous, text].slice(-INPUT_HISTORY_LIMIT)));
    setHistoryCursor(null);
    setHistoryDraft('');
    setSending(true);
    liveRef.current = emptyLiveState();
    setLive(liveRef.current);

    const finalize = (reply: AIAgentReply) => {
      const steps = liveRef.current?.steps || [];
      setMessages((previous) => [...previous, { role: 'assistant', content: reply.reply, suggestions: reply.suggestions || [], toolCalls: reply.tool_calls || [], steps }]);
    };

    try {
      let reply: AIAgentReply;
      try {
        reply = await AIAgentService.chatStream(text, messages, {
          onStage: (stage) => updateLive((current) => ({ ...current, stage })),
          onStepStart: (step) => updateLive((current) => ({ ...current, steps: [...current.steps, { ...step, status: 'running' as const }] })),
          onStepEnd: (step) => updateLive((current) => ({
            ...current,
            steps: current.steps.map((item) => (item.id === step.id ? { ...item, status: step.status, duration_ms: step.duration_ms, error: step.error } : item)),
          })),
          onNote: (noteText) => updateLive((current) => ({ ...current, notes: [...current.notes, noteText] })),
          onDelta: (deltaText) => updateLive((current) => ({ ...current, text: current.text + deltaText })),
        });
      } catch (streamError) {
        // A stream that failed before anything was shown (older backend,
        // proxy hiccup) silently falls back to the classic chat endpoint;
        // once output is on screen the error is surfaced instead of
        // discarding a run the administrator is watching.
        const partial = liveRef.current;
        const hadOutput = Boolean(partial && (partial.text || partial.steps.length > 0 || partial.notes.length > 0));
        if (hadOutput) throw streamError;
        reply = await AIAgentService.chat(text, messages);
      }
      finalize(reply);
    } catch (error: unknown) {
      const detail = errorMessage(error);
      toast.error(detail || (zh ? 'AI 暂时无法生成建议' : 'AI could not generate a proposal'));
      setMessages((previous) => previous.filter((item) => item !== userMessage));
    } finally {
      liveRef.current = null;
      setLive(null);
      setSending(false);
    }
  };

  const apply = async (action: AIAgentAction, key: string) => {
    setApplyingKey(key);
    try {
      await AIAgentService.apply([action]);
      setAppliedKeys((previous) => [...previous, key]);
      toast.success(action.type === 'start_category_optimization'
        ? (zh ? '分类任务已启动，可到分类页或 AI SEO 页面查看进度。' : 'Category task started — track progress on the categories or AI SEO page.')
        : (zh ? '建议已应用，网站缓存将自动刷新。' : 'Suggestion applied. Public cache will refresh automatically.'));
    } catch (error: unknown) {
      const detail = errorMessage(error);
      toast.error(detail || (zh ? '应用建议失败' : 'Could not apply suggestion'));
    } finally {
      setApplyingKey(null);
    }
  };

  const applyGroup = async (actions: AIAgentAction[], messageIndex: number) => {
    // Proposals that would create a brand-new public type stay out of a batch
    // apply; each one gets an individual review instead.
    const applicable = actions.filter((action) => !(action.type === 'create_category' && action.data?.allow_new_product_types === true));
    const unapplied = applicable.filter((action) => {
      const actionIndex = actions.indexOf(action);
      return !appliedKeys.includes(`${messageIndex}-${actionIndex}`);
    });
    if (unapplied.length === 0) return;
    const batchKey = `all-${messageIndex}`;
    setApplyingKey(batchKey);
    try {
      // New-type category creations are excluded above so one deliberately
      // reviewed proposal cannot slip through a batch apply.
      await AIAgentService.apply(unapplied);
      setAppliedKeys((previous) => [
        ...previous,
        ...unapplied
          .map((action) => `${messageIndex}-${actions.indexOf(action)}`)
          .filter((key) => !previous.includes(key)),
      ]);
      const reviewCount = actions.length - applicable.length;
      const suffix = reviewCount > 0 ? (zh ? `，${reviewCount} 条新类型分类建议需单独审核` : `; ${reviewCount} new-type category proposal(s) require individual review`) : '';
      toast.success(zh ? `已应用 ${unapplied.length} 条建议${suffix}，网站缓存将自动刷新。` : `${unapplied.length} suggestions applied${suffix}. Public cache will refresh automatically.`);
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (zh ? '应用建议失败' : 'Could not apply suggestions'));
    } finally {
      setApplyingKey(null);
    }
  };

  const reset = () => {
    setMessages([]);
    setAppliedKeys([]);
    setInput('');
    liveRef.current = null;
    setLive(null);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[70] print:hidden">
      {open && (
        <section className="mb-3 flex h-[min(700px,calc(100vh-7.5rem))] w-[calc(100vw-2.5rem)] max-w-[520px] flex-col overflow-hidden rounded-2xl border border-violet-200 bg-white shadow-2xl" aria-label={zh ? 'AI 商品优化助手' : 'AI catalog optimization assistant'}>
          <header className="flex items-center justify-between bg-gradient-to-r from-violet-700 to-indigo-700 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5" />
              <div>
                <h2 className="text-sm font-semibold">{zh ? 'AI 商品优化助手' : 'AI Catalog Assistant'}</h2>
                <p className="text-[11px] text-violet-100">{status?.configured ? `${status.provider || 'OpenAI compatible'} · ${status.model}` : (zh ? '分类、SEO 与多语言优化' : 'Categories, SEO and localization')}</p>
                {status?.task_gate && (
                  <p className="mt-0.5 text-[10px] text-violet-200">
                    {zh
                      ? `AI 任务 ${status.task_gate.active}/${status.task_gate.limit}${status.task_gate.queued_jobs > 0 ? ` · 排队 ${status.task_gate.queued_jobs}` : ''}`
                      : `AI tasks ${status.task_gate.active}/${status.task_gate.limit}${status.task_gate.queued_jobs > 0 ? ` · ${status.task_gate.queued_jobs} queued` : ''}`}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              {mode === 'assistant' && <button type="button" onClick={reset} className="rounded p-1.5 hover:bg-white/15" title={zh ? '新对话' : 'New conversation'} aria-label={zh ? '新对话' : 'New conversation'}><ArrowPathIcon className="h-4 w-4" /></button>}
              <button type="button" onClick={() => setOpen(false)} className="rounded p-1.5 hover:bg-white/15" aria-label={zh ? '关闭' : 'Close'}><XMarkIcon className="h-5 w-5" /></button>
            </div>
          </header>

          <div className="grid grid-cols-2 border-b border-gray-200 bg-white p-1" role="tablist" aria-label={zh ? '优化模式' : 'Optimization mode'}>
            <button type="button" role="tab" aria-selected={mode === 'assistant'} onClick={() => setMode('assistant')} className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${mode === 'assistant' ? 'bg-violet-100 text-violet-800' : 'text-gray-600 hover:bg-gray-50'}`}><ChatBubbleLeftRightIcon className="h-4 w-4" />{zh ? '目录与 SEO' : 'Catalog & SEO'}</button>
            <button type="button" role="tab" aria-selected={mode === 'prices'} onClick={() => setMode('prices')} className={`inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold ${mode === 'prices' ? 'bg-emerald-100 text-emerald-800' : 'text-gray-600 hover:bg-gray-50'}`}><CurrencyDollarIcon className="h-4 w-4" />{zh ? '价格同步' : 'Price sync'}</button>
          </div>

          {mode === 'prices' ? <AIPriceSyncPanel zh={zh} /> : <>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50 p-3" role="tabpanel">
            {statusLoading && <p className="pt-6 text-center text-sm text-gray-500">{zh ? '正在检查 AI 配置…' : 'Checking AI configuration…'}</p>}
            {!statusLoading && status && !status.configured && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <div className="flex gap-2"><ExclamationTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">{zh ? 'AI 尚未配置' : 'AI is not configured'}</p><p className="mt-1 text-xs leading-5">{zh ? '请让管理员进入“AI 助手”页面，保存 API Key、模型与推理强度后启用。密钥只会加密保存于数据库，不会暴露到浏览器。' : 'An administrator must open AI Assistant, save the API key, model, and reasoning effort, then enable it. The key is encrypted in the database and never reaches the browser.'}</p></div></div>
              </div>
            )}
            {!statusLoading && status?.configured && messages.length === 0 && (
              <div className="space-y-3 py-2">
                <div className="rounded-xl bg-white p-3 text-sm leading-6 text-gray-700 shadow-sm ring-1 ring-gray-100">
                  {zh ? '直接把型号（一行一个，最多 1000 个）发给我：我会自动判断品牌和产品类型、缺失的分类按核验规则创建，并为每个型号写好名称、简短描述、详细描述和 SEO 信息。售价、质保、交期、库存只采用后台保存的默认值，图片继续使用按型号自动生成的图库默认图片。确认后即按设置上架。' : 'Enter a model directly, one per line (up to 1000): the assistant resolves brand and product type, creates missing categories through the verified-rule path, and writes a name, short description, long description and SEO fields for each model. Price, warranty, lead time and stock use only saved admin defaults, and images stay on the generated default catalogue image. Approved products are published according to your settings.'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_PROMPTS.map((prompt) => <button key={prompt} type="button" onClick={() => { setInput(prompt); setPromptLibraryOpen(true); }} className="rounded-lg border border-violet-200 bg-white px-2.5 py-1.5 text-left text-xs leading-4 text-violet-700 hover:bg-violet-50">{prompt.split('\n')[0]}</button>)}
                </div>
              </div>
            )}
            {messages.map((message, messageIndex) => (
              <div key={`${message.role}-${messageIndex}`} className={message.role === 'user' ? 'ml-8' : 'mr-3'}>
                {message.role === 'user' ? (
                  <div className="rounded-xl bg-violet-600 px-3 py-2 text-sm leading-6 whitespace-pre-wrap text-white">{message.content}</div>
                ) : (
                  <div className="rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm leading-6 text-gray-800 shadow-sm">
                    {message.steps && message.steps.length > 0 && <AssistantSteps steps={message.steps} zh={zh} />}
                    <MarkdownBlock content={message.content} />
                  </div>
                )}
                {message.suggestions && message.suggestions.length > 0 && <div className="mt-2 space-y-2">
                  {message.suggestions.length > 1 && message.suggestions.some((action, actionIndex) => !(action.type === 'create_category' && action.data?.allow_new_product_types === true) && !appliedKeys.includes(`${messageIndex}-${actionIndex}`)) && (
                    <button
                      type="button"
                      onClick={() => applyGroup(message.suggestions || [], messageIndex)}
                      disabled={applyingKey === `all-${messageIndex}` || applyingKey !== null}
                      className="w-full rounded-lg border border-violet-300 bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {applyingKey === `all-${messageIndex}` ? (zh ? '正在应用全部建议…' : 'Applying all suggestions…') : (zh ? '确认并应用本轮全部建议' : 'Review and apply all suggestions')}
                    </button>
                  )}
                  {message.suggestions.map((action, actionIndex) => {
                    const key = `${messageIndex}-${actionIndex}`;
                    const requiresBatch = Boolean(action.data?.parent_client_key || action.data?.category_client_key);
                    return <ProposalCard key={key} action={action} applying={applyingKey === key || applyingKey === `all-${messageIndex}`} applied={appliedKeys.includes(key)} requiresBatch={requiresBatch} onApply={() => apply(action, key)} />;
                  })}
                </div>}
              </div>
            ))}
            {sending && live && (
              <div className="mr-3">
                <div className="rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm shadow-sm">
                  <AssistantSteps steps={live.steps} zh={zh} />
                  {live.notes.length > 0 && (
                    <div className="mb-1.5 space-y-0.5 border-b border-slate-100 pb-1.5 text-xs leading-5 text-slate-400">
                      {live.notes.map((note, noteIndex) => <p key={noteIndex} className="whitespace-pre-wrap">{note}</p>)}
                    </div>
                  )}
                  {live.text ? (
                    <div className="text-gray-800">
                      <MarkdownBlock content={live.text} />
                      <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse bg-violet-500 align-[-2px]" aria-hidden="true" />
                    </div>
                  ) : (
                    live.steps.length === 0 && live.notes.length === 0 && (
                      <p className="text-xs text-gray-400">{live.stage === 'answering' ? (zh ? '正在生成回答…' : 'Writing the answer…') : (zh ? '正在思考并检索目录…' : 'Thinking and checking the catalogue…')}</p>
                    )
                  )}
                </div>
              </div>
            )}
            {sending && !live && <div className="mr-8 rounded-xl border border-gray-100 bg-white px-3 py-2 text-sm text-gray-500 shadow-sm">{zh ? '正在分析分类和 SEO…' : 'Analyzing categories and SEO…'}</div>}
            <div ref={bottomRef} />
          </div>

          {promptLibraryOpen && (
            <div className="flex max-h-72 min-h-0 shrink-0 flex-col border-t border-gray-200">
              <AIPromptLibrary zh={zh} onInsert={(content) => setInput(content)} />
            </div>
          )}
          <form onSubmit={send} className="border-t border-gray-200 bg-white p-3">
            <div className="mb-1.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPromptLibraryOpen((open) => !open)}
                aria-expanded={promptLibraryOpen}
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] ${promptLibraryOpen ? 'bg-violet-100 font-semibold text-violet-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <BookmarkIcon className="h-3.5 w-3.5" />
                {zh ? '提示词库' : 'Prompt library'}
              </button>
              <span className="truncate text-[11px] text-gray-400">{zh ? '保存常用指令，一键插入或复制' : 'Save instructions and insert or copy them in one click'}</span>
            </div>
            <div className="flex items-end gap-2 rounded-xl border border-gray-300 bg-white p-1.5 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-100">
              <textarea value={input} onChange={(event) => { setInput(event.target.value); setHistoryCursor(null); }} onKeyDown={handleInputKeyDown} disabled={!status?.configured || sending} rows={3} maxLength={200000} aria-label={zh ? 'AI 优化指令' : 'AI optimization instruction'} placeholder={zh ? '粘贴型号清单，一行一个或逗号分隔，最多 1000 个型号（例如 A06B-2235-B100）' : 'Paste a model list, one per line or comma separated, up to 1000 models (e.g. A06B-2235-B100)'} className="max-h-64 min-h-[62px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-1 text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed" />
              <button type="submit" disabled={!input.trim() || !status?.configured || sending} className="rounded-lg bg-violet-600 p-2 text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-gray-300" aria-label={zh ? '发送' : 'Send'}><PaperAirplaneIcon className="h-4 w-4" /></button>
            </div>
            {input.trim().length > 600 && (
              <p className="mt-1 text-[11px] font-medium text-violet-600">{zh ? `已输入 ${input.length.toLocaleString()} 字符（上限 200,000）；识别出的型号会自动建类目、去重并上架，未识别的会单独列出` : `${input.length.toLocaleString()} / 200,000 characters; recognized models are categorized, de-duplicated and published, and anything unrecognized is listed separately`}</p>
            )}
            <p className="mt-1.5 text-[11px] text-gray-400">{status?.product_creation_ready ? (zh ? `AI 会自动建类目并创建产品，默认售价 ${status.default_product_price} USD，${status.auto_publish_new_products === false ? '确认后先存草稿' : '确认后直接上架'}。` : `The assistant creates the category and product; default price ${status.default_product_price} USD, ${status.auto_publish_new_products === false ? 'kept as a draft' : 'published on approval'}.`) : (zh ? '尚未设置默认质保或交期；AI 可分析，但不会创建产品。' : 'No default warranty or lead time is configured; AI can analyze but cannot create products.')}</p>
            <p className="mt-0.5 text-[11px] text-gray-400">{zh ? 'Enter 发送，Shift+Enter 换行，↑/↓ 调出历史输入；可整段粘贴型号清单（单次最多 1000 个）' : 'Enter to send, Shift+Enter for a new line, ↑/↓ recalls previous input; paste a whole model list (up to 1000 at a time)'}</p>
          </form>
          </>}
        </section>
      )}
      <button type="button" onClick={() => setOpen((current) => !current)} className="group flex h-14 items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-4 text-sm font-semibold text-white shadow-xl transition hover:scale-[1.02] hover:from-violet-700 hover:to-indigo-700 focus:outline-none focus:ring-4 focus:ring-violet-200" aria-expanded={open} aria-label={zh ? '打开 AI 商品优化助手' : 'Open AI catalog assistant'}>
        <SparklesIcon className="h-5 w-5 transition-transform group-hover:rotate-12" />
        <span>{zh ? 'AI 优化' : 'AI Optimize'}</span>
      </button>
    </div>
  );
}
