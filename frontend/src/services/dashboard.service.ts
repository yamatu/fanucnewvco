import { apiClient } from '@/lib/api';
import {
  APIResponse
} from '@/types';

export interface DashboardStats {
  total_products: number;
  active_products: number;
  featured_products: number;
  total_categories: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  monthly_orders: number;
  total_revenue: number;
  monthly_revenue: number;
  total_users: number;
  active_users: number;
  total_banners: number;
  total_purchase_links: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  orders: number;
}

export interface RecentOrder {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export interface TopProduct {
  id: number;
  name: string;
  sku: string;
  price: number;
  total_sold: number;
  revenue: number;
}

export interface OrderStatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export class DashboardService {
  // Admin: Get dashboard statistics
  static async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<APIResponse<DashboardStats>>(
      '/admin/dashboard/stats'
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch dashboard stats');
  }

  // Get recent orders for dashboard
  static async getRecentOrders(limit: number = 5, includePending: boolean = false): Promise<RecentOrder[]> {
    const response = await apiClient.get<APIResponse<RecentOrder[]>>(
      `/admin/dashboard/recent-orders?limit=${limit}&include_pending=${includePending ? 1 : 0}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch recent orders');
  }

  // Get top products for dashboard
  static async getTopProducts(limit: number = 5, days: number = 30): Promise<TopProduct[]> {
    const response = await apiClient.get<APIResponse<TopProduct[]>>(
      `/admin/dashboard/top-products?limit=${limit}&days=${days}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch top products');
  }

  // Get revenue data for charts
  static async getRevenueData(period: 'week' | 'month' | 'year' = 'month'): Promise<RevenueData[]> {
    const response = await apiClient.get<APIResponse<RevenueData[]>>(
      `/admin/dashboard/revenue?period=${period}`
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch revenue data');
  }

  // Get order status distribution
  static async getOrderStatusDistribution(): Promise<OrderStatusDistribution[]> {
    const response = await apiClient.get<APIResponse<OrderStatusDistribution[]>>(
      '/admin/dashboard/order-status-distribution'
    );

    if (response.data.success && response.data.data) {
      return response.data.data;
    }

    throw new Error(response.data.message || 'Failed to fetch order status distribution');
  }

  // Calculate growth percentage
  static calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  // Format currency for dashboard
  static formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // Format large numbers (K, M, B)
  static formatLargeNumber(num: number): string {
    if (num >= 1000000000) {
      return (num / 1000000000).toFixed(1) + 'B';
    }
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Get dashboard card data
  static getDashboardCards(stats: DashboardStats): Array<{
    title: string;
    value: string;
    change?: number;
    changeType?: 'increase' | 'decrease';
    icon: string;
    color: string;
  }> {
    return [
      {
        title: 'Total Products',
        value: stats.total_products.toString(),
        icon: 'cube',
        color: 'blue'
      },
      {
        title: 'Active Products',
        value: stats.active_products.toString(),
        icon: 'check-circle',
        color: 'green'
      },
      {
        title: 'Total Orders',
        value: stats.total_orders.toString(),
        icon: 'shopping-cart',
        color: 'purple'
      },
      {
        title: 'Pending Orders',
        value: stats.pending_orders.toString(),
        icon: 'clock',
        color: 'yellow'
      },
      {
        title: 'Total Revenue',
        value: this.formatCurrency(stats.total_revenue),
        icon: 'currency-dollar',
        color: 'green'
      },
      {
        title: 'Monthly Revenue',
        value: this.formatCurrency(stats.monthly_revenue),
        icon: 'trending-up',
        color: 'indigo'
      },
      {
        title: 'Total Users',
        value: stats.total_users.toString(),
        icon: 'users',
        color: 'pink'
      },
      {
        title: 'Active Users',
        value: stats.active_users.toString(),
        icon: 'user-check',
        color: 'teal'
      }
    ];
  }

  // Get chart colors
  static getChartColors(): {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
  } {
    return {
      primary: '#3B82F6',
      secondary: '#6B7280',
      success: '#10B981',
      warning: '#F59E0B',
      danger: '#EF4444',
      info: '#06B6D4'
    };
  }

  // Generate chart data for revenue
  static generateRevenueChartData(revenueData: RevenueData[]) {
    return {
      labels: revenueData.map(item => item.month),
      datasets: [
        {
          label: 'Revenue',
          data: revenueData.map(item => item.revenue),
          borderColor: this.getChartColors().primary,
          backgroundColor: this.getChartColors().primary + '20',
          tension: 0.4
        },
        {
          label: 'Orders',
          data: revenueData.map(item => item.orders),
          borderColor: this.getChartColors().secondary,
          backgroundColor: this.getChartColors().secondary + '20',
          tension: 0.4,
          yAxisID: 'y1'
        }
      ]
    };
  }

  // Generate chart data for order status
  static generateOrderStatusChartData(statusData: OrderStatusDistribution[]) {
    const colors = [
      this.getChartColors().primary,
      this.getChartColors().success,
      this.getChartColors().warning,
      this.getChartColors().danger,
      this.getChartColors().info,
      this.getChartColors().secondary
    ];

    return {
      labels: statusData.map(item => item.status),
      datasets: [
        {
          data: statusData.map(item => item.count),
          backgroundColor: colors.slice(0, statusData.length),
          borderWidth: 2,
          borderColor: '#ffffff'
        }
      ]
    };
  }
}

export default DashboardService;
