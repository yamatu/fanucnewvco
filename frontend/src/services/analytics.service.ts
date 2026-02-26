import { apiClient } from '@/lib/api';
import { APIResponse } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AnalyticsOverview {
  total_visitors: number;
  unique_ips: number;
  total_bots: number;
  bot_percentage: number;
  top_country: string;
  top_country_count: number;
}

export interface VisitorLog {
  id: number;
  ip_address: string;
  country: string;
  country_code: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  path: string;
  method: string;
  status_code: number;
  user_agent: string;
  is_bot: boolean;
  bot_name: string;
  referer: string;
  created_at: string;
}

export interface VisitorListResponse {
  data: VisitorLog[];
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface CountryData {
  country: string;
  country_code: string;
  count: number;
}

export interface PageData {
  path: string;
  count: number;
}

export interface TrendData {
  date: string;
  total: number;
  unique_ips: number;
  bots: number;
}

export interface AnalyticsSettings {
  id: number;
  retention_days: number;
  auto_cleanup_enabled: boolean;
  tracking_enabled: boolean;
  last_cleanup_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsFilters {
  start?: string;
  end?: string;
  country?: string;
  is_bot?: string;
  ip?: string;
  page?: number;
  page_size?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class AnalyticsService {
  static async getOverview(filters?: AnalyticsFilters): Promise<AnalyticsOverview> {
    const params = new URLSearchParams();
    if (filters?.start) params.set('start', filters.start);
    if (filters?.end) params.set('end', filters.end);
    const qs = params.toString();
    const url = `/admin/analytics/overview${qs ? '?' + qs : ''}`;
    const response = await apiClient.get<APIResponse<AnalyticsOverview>>(url);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to fetch analytics overview');
  }

  static async getVisitors(filters?: AnalyticsFilters): Promise<VisitorListResponse> {
    const params = new URLSearchParams();
    if (filters?.start) params.set('start', filters.start);
    if (filters?.end) params.set('end', filters.end);
    if (filters?.country) params.set('country', filters.country);
    if (filters?.is_bot !== undefined) params.set('is_bot', filters.is_bot);
    if (filters?.ip) params.set('ip', filters.ip);
    if (filters?.page) params.set('page', String(filters.page));
    if (filters?.page_size) params.set('page_size', String(filters.page_size));
    const qs = params.toString();
    const url = `/admin/analytics/visitors${qs ? '?' + qs : ''}`;
    const response = await apiClient.get<APIResponse<VisitorListResponse>>(url);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to fetch visitors');
  }

  static async getCountries(filters?: AnalyticsFilters): Promise<CountryData[]> {
    const params = new URLSearchParams();
    if (filters?.start) params.set('start', filters.start);
    if (filters?.end) params.set('end', filters.end);
    if (filters?.is_bot !== undefined) params.set('is_bot', filters.is_bot);
    const qs = params.toString();
    const url = `/admin/analytics/countries${qs ? '?' + qs : ''}`;
    const response = await apiClient.get<APIResponse<CountryData[]>>(url);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to fetch countries');
  }

  static async getPages(filters?: AnalyticsFilters): Promise<PageData[]> {
    const params = new URLSearchParams();
    if (filters?.start) params.set('start', filters.start);
    if (filters?.end) params.set('end', filters.end);
    if (filters?.limit) params.set('limit', String(filters.limit));
    const qs = params.toString();
    const url = `/admin/analytics/pages${qs ? '?' + qs : ''}`;
    const response = await apiClient.get<APIResponse<PageData[]>>(url);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to fetch pages');
  }

  static async getTrends(filters?: AnalyticsFilters): Promise<TrendData[]> {
    const params = new URLSearchParams();
    if (filters?.start) params.set('start', filters.start);
    if (filters?.end) params.set('end', filters.end);
    const qs = params.toString();
    const url = `/admin/analytics/trends${qs ? '?' + qs : ''}`;
    const response = await apiClient.get<APIResponse<TrendData[]>>(url);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to fetch trends');
  }

  static async getSettings(): Promise<AnalyticsSettings> {
    const response = await apiClient.get<APIResponse<AnalyticsSettings>>(
      '/admin/analytics/settings'
    );
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to fetch analytics settings');
  }

  static async updateSettings(data: Partial<Pick<AnalyticsSettings, 'retention_days' | 'auto_cleanup_enabled' | 'tracking_enabled'>>): Promise<AnalyticsSettings> {
    const response = await apiClient.put<APIResponse<AnalyticsSettings>>(
      '/admin/analytics/settings',
      data
    );
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to update analytics settings');
  }

  static async manualCleanup(before: string): Promise<{ deleted_count: number; before: string }> {
    const response = await apiClient.delete<APIResponse<{ deleted_count: number; before: string }>>(
      `/admin/analytics/cleanup?before=${before}`
    );
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to cleanup data');
  }
}

export default AnalyticsService;
