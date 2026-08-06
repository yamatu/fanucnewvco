import { apiClient } from '@/lib/api';
import { APIResponse } from '@/types';

export type AIAgentActionType =
  | 'create_category'
  | 'create_product'
  | 'update_product'
  | 'update_product_price'
  | 'upsert_product_translation'
  | 'upsert_category_translation';

export interface AIAgentAction {
  type: AIAgentActionType;
  title: string;
  data: Record<string, unknown>;
}

export interface AIAgentMessage {
  role: 'user' | 'assistant';
  content: string;
  suggestions?: AIAgentAction[];
}

export interface AIAgentStatus {
  configured: boolean;
  model: string;
  provider: string;
  reasoning_effort: string;
  product_creation_ready: boolean;
  default_product_price: number;
  default_warranty_period: string;
  default_lead_time: string;
}

export interface AIAgentSettings {
  enabled: boolean;
  base_url: string;
  has_api_key: boolean;
  model: string;
  reasoning_effort: string;
  timeout_seconds: number;
  seo_job_concurrency: number;
  seo_candidate_limit: number;
  default_product_price: number;
  default_warranty_period: string;
  default_lead_time: string;
  updated_at?: string;
}

export interface AIAgentSettingsUpdate {
  enabled?: boolean;
  base_url?: string;
  api_key?: string;
  clear_api_key?: boolean;
  model?: string;
  reasoning_effort?: string;
  timeout_seconds?: number;
  seo_job_concurrency?: number;
  seo_candidate_limit?: number;
  default_product_price?: number;
  default_warranty_period?: string;
  default_lead_time?: string;
}

export interface AIAgentReply {
  reply: string;
  suggestions: AIAgentAction[];
}

export interface AIAgentArticleDraftRequest {
  topic: string;
  keywords?: string;
  language?: string;
  content_type?: 'news' | 'blog';
  tone?: string;
  outline?: string;
}

export interface AIAgentArticleDraft {
  title: string;
  slug: string;
  summary: string;
  content: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
}

export type AIAgentPriceRowStatus =
  | 'matched'
  | 'unmatched'
  | 'ambiguous'
  | 'conflict'
  | 'invalid'
  | 'duplicate';

export interface AIAgentPricePreviewRow {
  line: number;
  model: string;
  price: number;
  currency?: string;
  status: AIAgentPriceRowStatus;
  message?: string;
  product_id?: number;
  sku?: string;
  product_name?: string;
  current_price?: number;
}

export interface AIAgentPricePreview {
  total: number;
  matched: number;
  unmatched: number;
  ambiguous: number;
  conflicts: number;
  invalid: number;
  duplicates: number;
  rows: AIAgentPricePreviewRow[];
  suggestions: AIAgentAction[];
}

export type AIAgentSEOJobStatus = 'queued' | 'running' | 'paused' | 'cancelled' | 'completed' | 'completed_with_errors' | 'failed';
export type AIAgentSEOItemStatus = 'queued' | 'running' | 'optimized' | 'failed' | 'cancelled';

export interface AIAgentSEOJobItem {
  id: number;
  job_id: string;
  product_id: number;
  sku: string;
  status: AIAgentSEOItemStatus;
  error?: string;
  created_at: string;
  updated_at: string;
}

export interface AIAgentSEOJob {
  id: string;
  prompt: string;
  selection_mode: 'selected' | 'auto_candidates' | 'auto_failed';
  status: AIAgentSEOJobStatus;
  total: number;
  processed: number;
  succeeded: number;
  failed: number;
  created_by_id: number;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
  items?: AIAgentSEOJobItem[];
}

export interface AIAgentSEOStats {
  total: number;
  optimized: number;
  not_optimized: number;
  failed: number;
  running: number;
}

export interface AIAgentSEOCandidateOptions {
  prompt: string;
  limit?: number;
  category_id?: number;
  include_descendants?: boolean;
  brand?: string;
  search?: string;
  include_failed?: boolean;
  failed_only?: boolean;
}

export class AIAgentService {
  static async status(): Promise<AIAgentStatus> {
    const response = await apiClient.get<APIResponse<AIAgentStatus>>('/admin/ai-agent/status');
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to check AI assistant status');
  }

  static async getSettings(): Promise<AIAgentSettings> {
    const response = await apiClient.get<APIResponse<AIAgentSettings>>('/admin/ai-agent/settings');
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to load AI settings');
  }

  static async updateSettings(payload: AIAgentSettingsUpdate): Promise<AIAgentSettings> {
    const response = await apiClient.put<APIResponse<AIAgentSettings>>('/admin/ai-agent/settings', payload);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to save AI settings');
  }

  static async chat(message: string, history: AIAgentMessage[]): Promise<AIAgentReply> {
    const response = await apiClient.post<APIResponse<AIAgentReply>>('/admin/ai-agent/chat', {
      message,
      history: history.slice(-8).map(({ role, content }) => ({ role, content })),
    });
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'AI assistant could not create a proposal');
  }

  static async apply(actions: AIAgentAction[]): Promise<Array<Record<string, unknown>>> {
    const response = await apiClient.post<APIResponse<Array<Record<string, unknown>>>>('/admin/ai-agent/apply', { actions });
    if (response.data.success) return response.data.data || [];
    throw new Error(response.data.message || 'AI suggestions could not be applied');
  }

  static async generateArticleDraft(payload: AIAgentArticleDraftRequest): Promise<AIAgentArticleDraft> {
    const response = await apiClient.post<APIResponse<AIAgentArticleDraft>>('/admin/ai-agent/article-draft', payload);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'AI article draft could not be generated');
  }

  static async previewPrices(text: string): Promise<AIAgentPricePreview> {
    const response = await apiClient.post<APIResponse<AIAgentPricePreview>>('/admin/ai-agent/prices/preview', { text });
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Price list could not be matched');
  }

  static async startSEOJob(productIds: number[], prompt: string): Promise<AIAgentSEOJob> {
    const response = await apiClient.post<APIResponse<AIAgentSEOJob>>('/admin/ai-agent/seo/jobs', {
      product_ids: productIds,
      prompt,
    });
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to start AI SEO job');
  }

  static async startSEOCandidateJob(options: AIAgentSEOCandidateOptions): Promise<AIAgentSEOJob> {
    const response = await apiClient.post<APIResponse<AIAgentSEOJob>>('/admin/ai-agent/seo/candidates', options);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to start AI SEO candidate job');
  }

  static async getSEOJob(id: string): Promise<AIAgentSEOJob> {
    const response = await apiClient.get<APIResponse<AIAgentSEOJob>>(`/admin/ai-agent/seo/jobs/${encodeURIComponent(id)}`);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to load AI SEO job');
  }

  static async pauseSEOJob(id: string): Promise<AIAgentSEOJob> {
    const response = await apiClient.post<APIResponse<AIAgentSEOJob>>(`/admin/ai-agent/seo/jobs/${encodeURIComponent(id)}/pause`);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to pause AI SEO job');
  }

  static async resumeSEOJob(id: string): Promise<AIAgentSEOJob> {
    const response = await apiClient.post<APIResponse<AIAgentSEOJob>>(`/admin/ai-agent/seo/jobs/${encodeURIComponent(id)}/resume`);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to resume AI SEO job');
  }

  static async endPausedSEOJob(id: string): Promise<AIAgentSEOJob> {
    const response = await apiClient.post<APIResponse<AIAgentSEOJob>>(`/admin/ai-agent/seo/jobs/${encodeURIComponent(id)}/end`);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to end paused AI SEO job');
  }

  static async listSEOJobs(): Promise<AIAgentSEOJob[]> {
    const response = await apiClient.get<APIResponse<AIAgentSEOJob[]>>('/admin/ai-agent/seo/jobs');
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to load AI SEO jobs');
  }

  static async getSEOStats(): Promise<AIAgentSEOStats> {
    const response = await apiClient.get<APIResponse<AIAgentSEOStats>>('/admin/ai-agent/seo/stats');
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Unable to load AI SEO statistics');
  }
}

export default AIAgentService;
