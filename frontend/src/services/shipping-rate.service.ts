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
  currency: string;
}

export interface ShippingQuote {
  country_code: string;
  currency: string;
  weight_kg: number;
  billing_weight_kg?: number;
  rate_per_kg: number;
  base_quote: number;
  additional_fee: number;
  shipping_fee: number;
}

export interface ShippingRateImportResult {
  countries: number;
  created: number;
  updated: number;
  deleted: number;
  failed: number;
  errors: string[];
}

export class ShippingRateService {
  static async publicCountries(): Promise<ShippingRatePublic[]> {
    const res = await apiClient.get<APIResponse<ShippingRatePublic[]>>('/public/shipping/countries');
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || 'Failed to fetch shipping rates');
  }

  static async quote(country: string, weightKg: number): Promise<ShippingQuote> {
    const qs = new URLSearchParams();
    qs.set('country', country);
    qs.set('weight_kg', String(weightKg || 0));
    const res = await apiClient.get<APIResponse<ShippingQuote>>(`/public/shipping/quote?${qs.toString()}`);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || res.data.error || 'Failed to calculate shipping');
  }

  static async adminList(q?: string): Promise<ShippingRate[]> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    const res = await apiClient.get<APIResponse<ShippingRate[]>>(`/admin/shipping-rates${qs}`);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || 'Failed to fetch shipping rates');
  }


  static async bulkDelete(payload: { all?: boolean; country_codes?: string[] }): Promise<{ deleted: number }> {
    const res = await apiClient.post<APIResponse<any>>('/admin/shipping-rates/bulk-delete', payload);
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || 'Failed to delete shipping templates');
  }

  static async downloadTemplate(): Promise<Blob> {
    const res = await apiClient.get('/admin/shipping-rates/import/template', { responseType: 'blob' });
    return res.data as Blob;
  }

  static async importXlsx(file: File, opts?: { replace?: boolean }): Promise<ShippingRateImportResult> {
    const form = new FormData();
    form.append('file', file);
    const qs = opts?.replace ? '?replace=1' : '';
    const res = await apiClient.post<APIResponse<ShippingRateImportResult>>(`/admin/shipping-rates/import/xlsx${qs}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (res.data.success && res.data.data) return res.data.data;
    throw new Error(res.data.message || res.data.error || 'Failed to import shipping rates');
  }
}
