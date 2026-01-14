import { apiClient } from '@/lib/api';
import { 
  APIResponse, 
  Banner 
} from '@/types';

export interface BannerCreateRequest {
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  content_type: string;
  category_key?: string;
  sort_order: number;
  is_active: boolean;
}

export class BannerService {
  // Get public banners
  static async getPublicBanners(): Promise<Banner[]> {
    const response = await apiClient.get<APIResponse<Banner[]>>(
      '/api/v1/public/banners'
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch banners');
  }

  // Admin: Get banners
  static async getBanners(): Promise<Banner[]> {
    const response = await apiClient.get<APIResponse<Banner[]>>(
      '/api/v1/admin/banners'
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to fetch banners');
  }

  // Admin: Get single banner
  static async getBanner(id: number): Promise<Banner> {
    const response = await apiClient.get<APIResponse<Banner>>(
      `/api/v1/admin/banners/${id}`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Banner not found');
  }

  // Admin: Create banner
  static async createBanner(bannerData: BannerCreateRequest): Promise<Banner> {
    const response = await apiClient.post<APIResponse<Banner>>(
      '/api/v1/admin/banners',
      bannerData
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to create banner');
  }

  // Admin: Update banner
  static async updateBanner(id: number, bannerData: Partial<BannerCreateRequest>): Promise<Banner> {
    const response = await apiClient.put<APIResponse<Banner>>(
      `/api/v1/admin/banners/${id}`,
      bannerData
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to update banner');
  }

  // Admin: Delete banner
  static async deleteBanner(id: number): Promise<void> {
    const response = await apiClient.delete<APIResponse<void>>(
      `/api/v1/admin/banners/${id}`
    );
    
    if (!response.data.success) {
      throw new Error(response.data.message || 'Failed to delete banner');
    }
  }

  // Admin: Toggle banner status
  static async toggleBannerStatus(id: number): Promise<Banner> {
    const response = await apiClient.patch<APIResponse<Banner>>(
      `/api/v1/admin/banners/${id}/toggle-status`
    );
    
    if (response.data.success && response.data.data) {
      return response.data.data;
    }
    
    throw new Error(response.data.message || 'Failed to toggle banner status');
  }

  // Get banners by content type
  static async getBannersByType(contentType: string): Promise<Banner[]> {
    const banners = await this.getPublicBanners();
    return banners.filter(banner => banner.content_type === contentType);
  }

  // Get hero banners
  static async getHeroBanners(): Promise<Banner[]> {
    return this.getBannersByType('hero');
  }

  // Get category banners
  static async getCategoryBanners(): Promise<Banner[]> {
    return this.getBannersByType('category');
  }

  // Get warehouse banners
  static async getWarehouseBanners(): Promise<Banner[]> {
    return this.getBannersByType('warehouse');
  }

  // Get content type options
  static getContentTypeOptions(): Array<{ value: string; label: string; description: string }> {
    return [
      { 
        value: 'hero', 
        label: 'Hero Banner', 
        description: 'Main banner displayed prominently on homepage' 
      },
      { 
        value: 'category', 
        label: 'Category Banner', 
        description: 'Banner for specific product categories' 
      },
      { 
        value: 'warehouse', 
        label: 'Warehouse Banner', 
        description: 'Banner showcasing warehouse facilities' 
      },
      { 
        value: 'promotion', 
        label: 'Promotional Banner', 
        description: 'Banner for special offers and promotions' 
      },
    ];
  }

  // Get content type label
  static getContentTypeLabel(contentType: string): string {
    const typeOption = this.getContentTypeOptions().find(option => option.value === contentType);
    return typeOption?.label || contentType;
  }

  // Validate banner data
  static validateBannerData(bannerData: Partial<BannerCreateRequest>): string[] {
    const errors: string[] = [];

    if (!bannerData.title || bannerData.title.length < 3) {
      errors.push('Title must be at least 3 characters long');
    }

    if (!bannerData.image_url) {
      errors.push('Image URL is required');
    }

    if (!bannerData.content_type) {
      errors.push('Content type is required');
    }

    if (bannerData.link_url && !this.isValidUrl(bannerData.link_url)) {
      errors.push('Please enter a valid URL');
    }

    return errors;
  }

  // Helper: Validate URL
  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Sort banners by sort order
  static sortBanners(banners: Banner[]): Banner[] {
    return [...banners].sort((a, b) => a.sort_order - b.sort_order);
  }
}

export default BannerService;
