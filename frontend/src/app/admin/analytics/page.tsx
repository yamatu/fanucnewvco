'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  UsersIcon,
  ShoppingBagIcon,
  CurrencyDollarIcon,
  EyeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { AnalyticsService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import { formatCurrency } from '@/lib/utils';

export default function AdminAnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');

  // Fetch analytics data
  const { data: analyticsData, isLoading, error } = useQuery({
    queryKey: queryKeys.analytics.overview({ period: dateRange }),
    queryFn: () => AnalyticsService.getOverview({ period: dateRange }),
  });

  const analytics = analyticsData?.data;

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 3 months' },
    { value: '1y', label: 'Last year' },
  ];

  const getChangeIcon = (change: number) => {
    if (change > 0) {
      return <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />;
    } else if (change < 0) {
      return <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />;
    }
    return null;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Analytics</h3>
          <p className="text-gray-500">{error.message}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="mt-1 text-sm text-gray-500">
              Track your website performance and business metrics
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading analytics...</p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <EyeIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Page Views
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {analytics?.page_views?.toLocaleString() || '0'}
                          </div>
                          {analytics?.page_views_change !== undefined && (
                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${getChangeColor(analytics.page_views_change)}`}>
                              {getChangeIcon(analytics.page_views_change)}
                              <span className="ml-1">
                                {Math.abs(analytics.page_views_change)}%
                              </span>
                            </div>
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <UsersIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Unique Visitors
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {analytics?.unique_visitors?.toLocaleString() || '0'}
                          </div>
                          {analytics?.unique_visitors_change !== undefined && (
                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${getChangeColor(analytics.unique_visitors_change)}`}>
                              {getChangeIcon(analytics.unique_visitors_change)}
                              <span className="ml-1">
                                {Math.abs(analytics.unique_visitors_change)}%
                              </span>
                            </div>
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <ShoppingBagIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Orders
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {analytics?.orders_count?.toLocaleString() || '0'}
                          </div>
                          {analytics?.orders_change !== undefined && (
                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${getChangeColor(analytics.orders_change)}`}>
                              {getChangeIcon(analytics.orders_change)}
                              <span className="ml-1">
                                {Math.abs(analytics.orders_change)}%
                              </span>
                            </div>
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Revenue
                        </dt>
                        <dd className="flex items-baseline">
                          <div className="text-2xl font-semibold text-gray-900">
                            {formatCurrency(analytics?.revenue || 0)}
                          </div>
                          {analytics?.revenue_change !== undefined && (
                            <div className={`ml-2 flex items-baseline text-sm font-semibold ${getChangeColor(analytics.revenue_change)}`}>
                              {getChangeIcon(analytics.revenue_change)}
                              <span className="ml-1">
                                {Math.abs(analytics.revenue_change)}%
                              </span>
                            </div>
                          )}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts and Tables */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Top Products */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Top Products</h3>
                </div>
                <div className="p-6">
                  {analytics?.top_products?.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.top_products.map((product: any, index: number) => (
                        <div key={product.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {index + 1}
                              </span>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm font-medium text-gray-900">
                                {product.name}
                              </p>
                              <p className="text-sm text-gray-500">
                                {product.views} views
                              </p>
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-900">
                            {formatCurrency(product.revenue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No product data available</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
                </div>
                <div className="p-6">
                  {analytics?.recent_orders?.length > 0 ? (
                    <div className="space-y-4">
                      {analytics.recent_orders.map((order: any) => (
                        <div key={order.id} className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Order #{order.order_number}
                            </p>
                            <p className="text-sm text-gray-500">
                              {order.customer_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">
                              {formatCurrency(order.total_amount)}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No recent orders</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Traffic Sources</h3>
              </div>
              <div className="p-6">
                {analytics?.traffic_sources?.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {analytics.traffic_sources.map((source: any) => (
                      <div key={source.source} className="text-center">
                        <div className="text-2xl font-semibold text-gray-900">
                          {source.visitors.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 capitalize">
                          {source.source}
                        </div>
                        <div className="text-xs text-gray-400">
                          {((source.visitors / analytics.unique_visitors) * 100).toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No traffic data available</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
