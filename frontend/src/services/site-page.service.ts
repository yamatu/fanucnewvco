import { apiClient } from '@/lib/api';
import type { APIResponse, SitePage, SitePageRequest } from '@/types';

export class SitePageService {
  static async getPublicPage(pageKey: string): Promise<SitePage> {
    const response = await apiClient.get<APIResponse<SitePage>>(`/public/site-pages/${pageKey}`);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error('Page not found');
  }

  static async getAdminPages(): Promise<SitePage[]> {
    const response = await apiClient.get<APIResponse<SitePage[]>>('/admin/site-pages');
    return response.data.data || [];
  }

  static async getAdminPage(pageKey: string): Promise<SitePage> {
    const pages = await this.getAdminPages();
    const page = pages.find((item) => item.page_key === pageKey);
    if (page) return page;
    throw new Error('Page not found');
  }

  static async savePage(pageKey: string, data: SitePageRequest): Promise<SitePage> {
    const response = await apiClient.put<APIResponse<SitePage>>(`/admin/site-pages/${pageKey}`, data);
    if (response.data.success && response.data.data) return response.data.data;
    throw new Error(response.data.message || 'Failed to save page');
  }
}
