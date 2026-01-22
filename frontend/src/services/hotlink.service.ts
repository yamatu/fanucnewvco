import { apiClient } from '@/lib/api';
import type { APIResponse } from '@/types';

export interface HotlinkProtectionSettingResponse {
  id: number;
  enabled: boolean;
  allowed_hosts: string;
  allow_empty_referer: boolean;
  allow_same_host: boolean;
  updated_at?: string;
  created_at?: string;
}

export interface UpdateHotlinkProtectionSettingRequest {
  enabled?: boolean;
  allowed_hosts?: string;
  allow_empty_referer?: boolean;
  allow_same_host?: boolean;
}

export class HotlinkService {
  static async getSettings(): Promise<HotlinkProtectionSettingResponse> {
    const res = await apiClient.get<APIResponse<HotlinkProtectionSettingResponse>>('/admin/hotlink/settings');
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || res.data.error || 'Failed to load hotlink settings');
  }

  static async updateSettings(payload: UpdateHotlinkProtectionSettingRequest): Promise<HotlinkProtectionSettingResponse> {
    const res = await apiClient.put<APIResponse<HotlinkProtectionSettingResponse>>('/admin/hotlink/settings', payload);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || res.data.error || 'Failed to save hotlink settings');
  }
}
