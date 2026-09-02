import { apiClient } from '@/lib/api';
import type { APIResponse, SocialMediaSettings, SocialMediaSettingsRequest } from '@/types';

function extractSettings(response: APIResponse<SocialMediaSettings>, fallback: string): SocialMediaSettings {
  if (response.success && response.data) {
    return response.data;
  }
  throw new Error(response.error || response.message || fallback);
}

export class SocialMediaService {
  static async getPublic(): Promise<SocialMediaSettings> {
    const response = await apiClient.get<APIResponse<SocialMediaSettings>>('/public/social-media');
    return extractSettings(response.data, 'Failed to load social media links');
  }

  static async getAdmin(): Promise<SocialMediaSettings> {
    const response = await apiClient.get<APIResponse<SocialMediaSettings>>('/admin/social-media');
    return extractSettings(response.data, 'Failed to load social media settings');
  }

  static async update(payload: SocialMediaSettingsRequest): Promise<SocialMediaSettings> {
    const response = await apiClient.put<APIResponse<SocialMediaSettings>>('/admin/social-media', payload);
    return extractSettings(response.data, 'Failed to save social media settings');
  }
}

export default SocialMediaService;
