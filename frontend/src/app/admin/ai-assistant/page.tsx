'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { AIAgentService, AIAgentSettings } from '@/services/ai-agent.service';
import { useAdminI18n } from '@/lib/admin-i18n';

type FormState = {
  enabled: boolean;
  base_url: string;
  api_key: string;
  model: string;
  reasoning_effort: string;
  timeout_seconds: number;
  seo_job_concurrency: number;
  seo_candidate_limit: number;
};

const presets = [
  { model: 'gpt-5.6-sol', title: 'GPT-5.6 Sol', zh: '质量与复杂推理优先', en: 'Best quality for complex taxonomy and SEO decisions', effort: 'high' },
  { model: 'gpt-5.6-terra', title: 'GPT-5.6 Terra', zh: '平衡质量、速度与成本（推荐）', en: 'Balanced quality, speed, and cost', effort: 'medium' },
  { model: 'gpt-5.6-luna', title: 'GPT-5.6 Luna', zh: '快速批量分类与轻量任务', en: 'Fast classification and high-volume tasks', effort: 'low' },
];

const blankForm: FormState = {
  enabled: false,
  base_url: 'https://api.openai.com/v1',
  api_key: '',
  model: 'gpt-5.6-terra',
  reasoning_effort: 'medium',
  timeout_seconds: 75,
  seo_job_concurrency: 2,
  seo_candidate_limit: 30000,
};

function errorMessage(error: unknown) {
  if (typeof error === 'object' && error !== null) {
    const item = error as { message?: unknown; response?: { data?: { error?: unknown; message?: unknown } } };
    const server = item.response?.data?.error || item.response?.data?.message;
    if (typeof server === 'string' && server) return server;
    if (typeof item.message === 'string' && item.message) return item.message;
  }
  return '';
}

export default function AIAssistantSettingsPage() {
  const { locale, t } = useAdminI18n();
  const zh = locale === 'zh';
  const [settings, setSettings] = useState<AIAgentSettings | null>(null);
  const [form, setForm] = useState<FormState>(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [clearKey, setClearKey] = useState(false);

  useEffect(() => {
    AIAgentService.getSettings()
      .then((data) => {
        setSettings(data);
        setForm({
          enabled: data.enabled,
          base_url: data.base_url || blankForm.base_url,
          api_key: '',
          model: data.model || blankForm.model,
          reasoning_effort: data.reasoning_effort,
          timeout_seconds: data.timeout_seconds || 75,
          seo_job_concurrency: data.seo_job_concurrency || 2,
          seo_candidate_limit: data.seo_candidate_limit || 30000,
        });
      })
      .catch((error: unknown) => toast.error(errorMessage(error) || (zh ? '无法读取 AI 配置' : 'Could not load AI settings')))
      .finally(() => setLoading(false));
  }, [zh]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await AIAgentService.updateSettings({
        enabled: form.enabled,
        base_url: form.base_url,
        api_key: form.api_key || undefined,
        clear_api_key: clearKey,
        model: form.model,
        reasoning_effort: form.reasoning_effort,
        timeout_seconds: Number(form.timeout_seconds),
        seo_job_concurrency: Number(form.seo_job_concurrency),
        seo_candidate_limit: Number(form.seo_candidate_limit),
      });
      setSettings(saved);
      setClearKey(false);
      setForm((current) => ({ ...current, api_key: '' }));
      toast.success(zh ? 'AI 配置已保存，右下角助手会立即使用新配置。' : 'AI settings saved. The floating assistant will use the new configuration.');
    } catch (error: unknown) {
      toast.error(errorMessage(error) || (zh ? '保存 AI 配置失败' : 'Could not save AI settings'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-violet-700 to-indigo-700 px-6 py-7 text-white shadow-sm">
          <div className="flex items-start gap-3">
            <SparklesIcon className="mt-0.5 h-7 w-7" />
            <div>
              <h1 className="text-2xl font-bold">{t('nav.aiAssistant', zh ? 'AI 助手' : 'AI Assistant')}</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-violet-100">
                {zh ? '在这里保存 OpenAI 或 OpenAI-compatible Provider。API Key 会以加密形式保存到数据库，浏览器只会知道“已保存”，不会获得密钥内容。' : 'Save an OpenAI or OpenAI-compatible provider here. The API key is encrypted in the database; the browser only knows whether a key exists.'}
              </p>
            </div>
          </div>
        </div>

        {loading ? <div className="rounded-xl border bg-white p-10 text-center text-sm text-gray-500">{zh ? '正在加载配置…' : 'Loading settings…'}</div> : (
          <form onSubmit={save} className="space-y-6">
            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900">{zh ? '启用 AI 助手' : 'Enable AI Assistant'}</h2>
                  <p className="mt-1 text-sm text-gray-500">{zh ? '启用后，管理员和编辑员可从右下角对话框获取分类与 SEO 建议。' : 'When enabled, administrators and editors can use the floating chat for catalog and SEO proposals.'}</p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-3"><span className="text-sm font-medium text-gray-700">{form.enabled ? (zh ? '已启用' : 'Enabled') : (zh ? '已关闭' : 'Disabled')}</span><input type="checkbox" checked={form.enabled} onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))} className="h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" /></label>
              </div>
              {settings?.has_api_key ? <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700"><CheckCircleIcon className="h-4 w-4" />{zh ? 'API Key 已加密保存' : 'API key is encrypted and saved'}</p> : <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700"><ExclamationTriangleIcon className="h-4 w-4" />{zh ? '请保存 API Key 后再启用' : 'Save an API key before enabling'}</p>}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">Provider</h2>
              <p className="mt-1 text-sm text-gray-500">{zh ? '使用标准 OpenAI Chat Completions API 的服务均可接入。' : 'Any provider compatible with the standard OpenAI Chat Completions API can be used.'}</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">API Base URL<input required value={form.base_url} onChange={(event) => setForm((current) => ({ ...current, base_url: event.target.value }))} placeholder="https://api.openai.com/v1" className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label>
                <label className="block text-sm font-medium text-gray-700">API Key<input type="password" value={form.api_key} onChange={(event) => { setClearKey(false); setForm((current) => ({ ...current, api_key: event.target.value })); }} placeholder={settings?.has_api_key ? (zh ? '留空以保留已保存的 Key' : 'Leave blank to keep saved key') : 'sk-...'} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" autoComplete="new-password" /></label>
              </div>
              {settings?.has_api_key && <label className="mt-3 inline-flex items-center gap-2 text-sm text-red-700"><input type="checkbox" checked={clearKey} onChange={(event) => setClearKey(event.target.checked)} className="rounded border-gray-300 text-red-600 focus:ring-red-500" />{zh ? '删除已保存的 API Key（保存后生效）' : 'Remove saved API key on save'}</label>}
            </section>

            <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-gray-900">{zh ? '模型与推理强度' : 'Model and reasoning effort'}</h2>
              <p className="mt-1 text-sm text-gray-500">{zh ? '推理强度类似 Codex 的思考档位：越高通常越仔细，但响应更慢、成本更高。' : 'Reasoning effort is similar to Codex thinking levels: higher is usually more thorough, but slower and more expensive.'}</p>
              <div className="mt-5 grid gap-3 md:grid-cols-3">{presets.map((preset) => <button key={preset.model} type="button" onClick={() => setForm((current) => ({ ...current, model: preset.model, reasoning_effort: preset.effort }))} className={`rounded-xl border p-4 text-left transition ${form.model === preset.model ? 'border-violet-500 bg-violet-50 ring-2 ring-violet-100' : 'border-gray-200 hover:border-violet-300'}`}><p className="font-semibold text-gray-900">{preset.title}</p><p className="mt-1 text-xs leading-5 text-gray-600">{zh ? preset.zh : preset.en}</p><p className="mt-3 text-xs font-medium text-violet-700">{zh ? `默认推理：${preset.effort}` : `Default reasoning: ${preset.effort}`}</p></button>)}</div>
              <div className="mt-5 grid gap-4 md:grid-cols-3">
                <label className="block text-sm font-medium text-gray-700">{zh ? '模型名称（可自定义）' : 'Model name (custom allowed)'}<input required value={form.model} onChange={(event) => setForm((current) => ({ ...current, model: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label>
                <label className="block text-sm font-medium text-gray-700">{zh ? '推理强度' : 'Reasoning effort'}<select value={form.reasoning_effort} onChange={(event) => setForm((current) => ({ ...current, reasoning_effort: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"><option value="">{zh ? '兼容模式：不发送推理参数' : 'Compatibility: do not send reasoning parameter'}</option><option value="none">none — {zh ? '最快' : 'fastest'}</option><option value="low">low</option><option value="medium">medium — {zh ? '平衡' : 'balanced'}</option><option value="high">high — {zh ? '深入' : 'thorough'}</option><option value="xhigh">xhigh — {zh ? '复杂任务' : 'complex tasks'}</option><option value="max">max — {zh ? '仅最难任务' : 'hardest tasks only'}</option></select></label>
                <label className="block text-sm font-medium text-gray-700">{zh ? '请求超时（秒）' : 'Request timeout (seconds)'}<input min="15" max="180" type="number" value={form.timeout_seconds} onChange={(event) => setForm((current) => ({ ...current, timeout_seconds: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /></label>
              </div>
              <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50/60 p-4">
                <h3 className="font-medium text-violet-950">{zh ? '批量 AI SEO 队列' : 'Bulk AI SEO queue'}</h3>
                <p className="mt-1 text-sm text-violet-900/80">{zh ? '产品页的“自动候选优化”会优先选择启用、未 AI 优化且内容较薄弱的商品。每次最多 30000 个；可以暂停后保留队列并继续执行，容器重启后未完成任务也会续跑。' : 'Automatic candidate optimization prioritizes active, not-yet-AI-optimized products with thinner content. Each batch is capped at 30000; you can pause while keeping the queue and resume later, and unfinished work resumes after a container restart.'}</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-gray-700">{zh ? '每个任务并行请求数' : 'Parallel requests per job'}<input min="1" max="50" type="number" value={form.seo_job_concurrency} onChange={(event) => setForm((current) => ({ ...current, seo_job_concurrency: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /><span className="mt-1 block text-xs font-normal text-gray-500">{zh ? '范围 1–50。较高速度会增加 API 并发与费用。' : 'Range 1–50. Higher values use more API concurrency and cost.'}</span></label>
                  <label className="block text-sm font-medium text-gray-700">{zh ? '自动候选上限' : 'Automatic candidate limit'}<input min="1" max="30000" type="number" value={form.seo_candidate_limit} onChange={(event) => setForm((current) => ({ ...current, seo_candidate_limit: Number(event.target.value) }))} className="mt-1.5 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-normal outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100" /><span className="mt-1 block text-xs font-normal text-gray-500">{zh ? '范围 1–30000。产品页可使用该上限一键创建候选队列。' : 'Range 1–30000. The product page uses this limit for one-click candidate queues.'}</span></label>
                </div>
              </div>
              <div className="mt-5 flex gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-5 text-blue-900"><InformationCircleIcon className="mt-0.5 h-4 w-4 shrink-0" /><p>{zh ? 'GPT-5.6 的 Chat Completions 会接收 reasoning_effort。若兼容服务不支持该参数，请选“兼容模式”，系统会完全不发送该字段。Pro 模式需要 Responses API，因此这里不会伪装成 Pro。' : 'GPT-5.6 Chat Completions accepts reasoning_effort. If a compatible provider rejects it, choose Compatibility mode and the field is omitted. Pro mode requires the Responses API, so this Chat Completions page does not imitate it.'}</p></div>
            </section>

            <div className="flex justify-end"><button disabled={saving} type="submit" className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? (zh ? '保存中…' : 'Saving…') : (zh ? '保存 AI 配置' : 'Save AI settings')}</button></div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
