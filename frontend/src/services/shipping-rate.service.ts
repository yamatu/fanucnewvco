import { apiClient } from '@/lib/api';
import { APIResponse } from '@/types';

export interface ShippingRate {
  id: number;
  country_code: string;
  country_name: string;
  fee: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ShippingRatePublic {
  country_code: string;
  country_name: string;
  fee: number;
  currency: string;
}

export interface ShippingRateImportResult {
  total_rows: number;
  created: number;
  updated: number;
  failed: number;
  items: Array<{ row_number: number; country_code: string; action: string; message?: string }>;
}

export class ShippingRateService {
  static async publicList(): Promise<ShippingRatePublic[]> {
    const res = await apiClient.get<APIResponse<ShippingRatePublic[]>>('/public/shipping/rates');
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || 'Failed to fetch shipping rates');
  }

  static async adminList(q?: string): Promise<ShippingRate[]> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const res = await apiClient.get<APIResponse<ShippingRate[]>>(`/admin/shipping-rates${qs}`);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || 'Failed to fetch shipping rates');
  }

  static async create(payload: { country_code: string; country_name: string; fee: number; currency?: string; is_active?: boolean }): Promise<ShippingRate> {
    const res = await apiClient.post<APIResponse<ShippingRate>>('/admin/shipping-rates', payload);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || 'Failed to create shipping rate');
  }

  static async update(id: number, payload: { country_code: string; country_name: string; fee: number; currency?: string; is_active?: boolean }): Promise<ShippingRate> {
    const res = await apiClient.put<APIResponse<ShippingRate>>(`/admin/shipping-rates/${id}`, payload);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || 'Failed to update shipping rate');
  }

  static async remove(id: number): Promise<void> {
    const res = await apiClient.delete<APIResponse<any>>(`/admin/shipping-rates/${id}`);
    if (res.data.success) return;
    throw new Error(res.data.message || 'Failed to delete shipping rate');
  }

  static async downloadTemplate(): Promise<Blob> {
    const res = await apiClient.get('/admin/shipping-rates/import/template', { responseType: 'blob' });
    return res.data as Blob;
  }

  static async importXlsx(file: File): Promise<ShippingRateImportResult> {
    const form = new FormData();
    form.append('file', file);
    const res = await apiClient.post<APIResponse<ShippingRateImportResult>>('/admin/shipping-rates/import/xlsx', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || res.data.error || 'Failed to import shipping rates');
  }
}
