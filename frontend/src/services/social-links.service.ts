import { apiClient } from '@/lib/api';
import type {
  SocialLinkSetting,
  SocialLinksPublicConfig,
  UpdateSocialLinkSettingRequest,
} from '@/lib/social-links';
import type { APIResponse } from '@/types';

export type { SocialLinkSetting, SocialLinksPublicConfig, UpdateSocialLinkSettingRequest } from '@/lib/social-links';
export { getConfiguredSocialURLs } from '@/lib/social-links';

export class SocialLinksService {
  static async getPublicConfig(): Promise<SocialLinksPublicConfig> {
    const res = await apiClient.get<APIResponse<SocialLinksPublicConfig>>('/public/social-links');
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || res.data.error || 'Failed to load social links');
  }

  static async getSettings(): Promise<SocialLinkSetting> {
    const res = await apiClient.get<APIResponse<SocialLinkSetting>>('/admin/social-links/settings');
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || res.data.error || 'Failed to load social link settings');
  }

  static async updateSettings(payload: UpdateSocialLinkSettingRequest): Promise<SocialLinkSetting> {
    const res = await apiClient.put<APIResponse<SocialLinkSetting>>('/admin/social-links/settings', payload);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || res.data.error || 'Failed to save social link settings');
  }
}

export default SocialLinksService;
