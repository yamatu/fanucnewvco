import { apiClient } from '@/lib/api';
import { APIResponse } from '@/types';

export interface AnalyticsOverview {
  page_views: number;
  page_views_change: number;
  unique_visitors: number;
  unique_visitors_change: number;
  orders_count: number;
  orders_change: number;
  revenue: number;
  revenue_change: number;
  top_products: Array<{
    id: number;
    name: string;
    views: number;
    revenue: number;
  }>;
  recent_orders: Array<{
    id: number;
    order_number: string;
    customer_name: string;
    total_amount: number;
    created_at: string;
  }>;
  traffic_sources: Array<{
    source: string;
    visitors: number;
    percentage: number;
  }>;
}

export class AnalyticsService {
  private static readonly BASE_PATH = '/admin/analytics';

  // Get analytics overview
  static async getOverview(params?: {
    period?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.append('period', params.period);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);

    const query = searchParams.toString();
    const url = query ? `${this.BASE_PATH}/overview?${query}` : `${this.BASE_PATH}/overview`;

    const response = await apiClient.get<APIResponse<AnalyticsOverview>>(url);
    return response.data;
  }

  // Get detailed analytics
  static async getDetailedAnalytics(params?: {
    metric?: string;
    period?: string;
    start_date?: string;
    end_date?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.metric) searchParams.append('metric', params.metric);
    if (params?.period) searchParams.append('period', params.period);
    if (params?.start_date) searchParams.append('start_date', params.start_date);
    if (params?.end_date) searchParams.append('end_date', params.end_date);

    const query = searchParams.toString();
    const url = query ? `${this.BASE_PATH}/detailed?${query}` : `${this.BASE_PATH}/detailed`;

    const response = await apiClient.get<APIResponse<any>>(url);
    return response.data;
  }

  // Get product analytics
  static async getProductAnalytics(params?: {
    product_id?: number;
    period?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.product_id) searchParams.append('product_id', params.product_id.toString());
    if (params?.period) searchParams.append('period', params.period);

    const query = searchParams.toString();
    const url = query ? `${this.BASE_PATH}/products?${query}` : `${this.BASE_PATH}/products`;

    const response = await apiClient.get<APIResponse<any>>(url);
    return response.data;
  }

  // Get user analytics
  static async getUserAnalytics(params?: {
    period?: string;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.period) searchParams.append('period', params.period);

    const query = searchParams.toString();
    const url = query ? `${this.BASE_PATH}/users?${query}` : `${this.BASE_PATH}/users`;

    const response = await apiClient.get<APIResponse<any>>(url);
    return response.data;
  }

  // Helper methods
  static getPeriodOptions() {
    return [
      { value: '7d', label: 'Last 7 days' },
      { value: '30d', label: 'Last 30 days' },
      { value: '90d', label: 'Last 3 months' },
      { value: '1y', label: 'Last year' },
      { value: 'custom', label: 'Custom range' },
    ];
  }

  static getMetricOptions() {
    return [
      { value: 'page_views', label: 'Page Views', icon: 'eye' },
      { value: 'unique_visitors', label: 'Unique Visitors', icon: 'users' },
      { value: 'orders', label: 'Orders', icon: 'shopping-bag' },
      { value: 'revenue', label: 'Revenue', icon: 'currency-dollar' },
    ];
  }

  static formatAnalyticsNumber(value: number, type: 'number' | 'currency' | 'percentage' = 'number'): string {
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'percentage':
        return `${value.toFixed(1)}%`;
      default:
        return value.toLocaleString();
    }
  }

  static calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  static getChangeDirection(change: number): 'up' | 'down' | 'neutral' {
    if (change > 0) return 'up';
    if (change < 0) return 'down';
    return 'neutral';
  }

  static getChangeColor(change: number): string {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  }
}
