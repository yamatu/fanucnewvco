'use client';

import { useQuery } from '@tanstack/react-query';
import {
  CubeIcon,
  ShoppingBagIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  EyeIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { DashboardService, OrderService, ProductService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import { formatCurrency } from '@/lib/utils';
import { useAdminI18n } from '@/lib/admin-i18n';

// Mock data for demonstration
const mockStats = {
  total_products: 1250,
  active_products: 1180,
  featured_products: 24,
  total_categories: 15,
  total_orders: 3420,
  pending_orders: 45,
  completed_orders: 3200,
  total_revenue: 2850000,
  monthly_revenue: 185000,
  total_users: 8,
  active_users: 6,
};

const mockRecentOrders = [
  {
    id: 1,
    order_number: 'ORD-2024-001',
    customer_name: 'John Smith',
    customer_email: 'john@company.com',
    total_amount: 2850.00,
    status: 'pending',
    created_at: '2024-01-15T10:30:00Z'
  },
  {
    id: 2,
    order_number: 'ORD-2024-002',
    customer_name: 'Sarah Johnson',
    customer_email: 'sarah@manufacturing.com',
    total_amount: 4200.00,
    status: 'completed',
    created_at: '2024-01-15T09:15:00Z'
  },
  {
    id: 3,
    order_number: 'ORD-2024-003',
    customer_name: 'Mike Chen',
    customer_email: 'mike@automation.com',
    total_amount: 1950.00,
    status: 'processing',
    created_at: '2024-01-15T08:45:00Z'
  }
];

const mockTopProducts = [
  {
    product: {
      id: 1,
      name: 'FANUC A02B-0120-C041',
      sku: 'A02B-0120-C041',
      price: 2850.00
    },
    total_sold: 45,
    revenue: 128250.00
  },
  {
    product: {
      id: 2,
      name: 'FANUC A860-0360-T001',
      sku: 'A860-0360-T001',
      price: 1950.00
    },
    total_sold: 38,
    revenue: 74100.00
  },
  {
    product: {
      id: 3,
      name: 'FANUC 10S-3000',
      sku: '10S-3000',
      price: 4200.00
    },
    total_sold: 22,
    revenue: 92400.00
  }
];

function StatCard({ title, value, change, changeType, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`flex-shrink-0 p-3 rounded-md ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-5 w-0 flex-1">
          <dl>
            <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
            <dd className="flex items-baseline">
              <div className="text-2xl font-semibold text-gray-900">{value}</div>
              {change && (
                <div className={`ml-2 flex items-baseline text-sm font-semibold ${
                  changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {changeType === 'increase' ? (
                    <ArrowUpIcon className="self-center flex-shrink-0 h-4 w-4" />
                  ) : (
                    <ArrowDownIcon className="self-center flex-shrink-0 h-4 w-4" />
                  )}
                  <span className="sr-only">
                    {changeType === 'increase' ? 'Increased' : 'Decreased'} by
                  </span>
                  {change}%
                </div>
              )}
            </dd>
          </dl>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useAdminI18n();
  // Fetch dashboard stats from API
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: DashboardService.getDashboardStats,
  });

  // Fetch recent orders
  const { data: ordersData } = useQuery({
    queryKey: ['dashboard', 'recent-orders'],
    queryFn: () => DashboardService.getRecentOrders(5),
  });

  // Fetch top products
  const { data: productsData } = useQuery({
    queryKey: ['dashboard', 'top-products'],
    queryFn: () => DashboardService.getTopProducts(5),
  });

  // Fetch revenue data
  const { data: revenueData } = useQuery({
    queryKey: ['dashboard', 'revenue', 'month'],
    queryFn: () => DashboardService.getRevenueData('month'),
  });

  const stats = dashboardData || mockStats; // Fallback to mock data
  const recentOrders = ordersData || mockRecentOrders;
  const topProducts = productsData || mockTopProducts;

  const dashboardCards = DashboardService.getDashboardCards(stats);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-gray-200 h-24 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('nav.dashboard', 'Dashboard')}</h1>
          <p className="mt-1 text-sm text-gray-500">
            Welcome back! Here's what's happening with your FANUC store today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Products"
            value={stats.total_products.toLocaleString()}
            change={5.2}
            changeType="increase"
            icon={CubeIcon}
            color="bg-blue-500"
          />
          <StatCard
            title="Active Products"
            value={stats.active_products.toLocaleString()}
            change={3.1}
            changeType="increase"
            icon={CubeIcon}
            color="bg-green-500"
          />
          <StatCard
            title="Total Orders"
            value={stats.total_orders.toLocaleString()}
            change={12.5}
            changeType="increase"
            icon={ShoppingBagIcon}
            color="bg-purple-500"
          />
          <StatCard
            title="Pending Orders"
            value={stats.pending_orders.toLocaleString()}
            change={-2.3}
            changeType="decrease"
            icon={ShoppingBagIcon}
            color="bg-yellow-500"
          />
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.total_revenue)}
            change={8.1}
            changeType="increase"
            icon={CurrencyDollarIcon}
            color="bg-emerald-500"
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(stats.monthly_revenue)}
            change={15.2}
            changeType="increase"
            icon={CurrencyDollarIcon}
            color="bg-indigo-500"
          />
          <StatCard
            title="Total Categories"
            value={stats.total_categories.toLocaleString()}
            change={1.0}
            changeType="increase"
            icon={CubeIcon}
            color="bg-pink-500"
          />
          <StatCard
            title="Active Users"
            value={stats.active_users}
            change={2.3}
            changeType="increase"
            icon={UsersIcon}
            color="bg-orange-500"
          />
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Recent Orders */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Recent Orders</h3>
            </div>
            <div className="overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <li key={order.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.order_number}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {order.customer_name} • {order.customer_email}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            order.status === 'completed' 
                              ? 'bg-green-100 text-green-800'
                              : order.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <button className="text-gray-400 hover:text-gray-500">
                          <EyeIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 py-3 border-t border-gray-200">
              <a href="/admin/orders" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                View all orders →
              </a>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Top Products</h3>
            </div>
            <div className="overflow-hidden">
              <ul className="divide-y divide-gray-200">
                {topProducts.map((item, index) => (
                  <li key={item.id || index} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              #{index + 1}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            SKU: {item.sku}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {item.total_sold || 0} sold
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatCurrency(item.revenue || 0)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="px-6 py-3 border-t border-gray-200">
              <a href="/admin/products" className="text-sm font-medium text-blue-600 hover:text-blue-500">
                View all products →
              </a>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <a
                href="/admin/products/new"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 border border-gray-200 rounded-lg hover:border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                    <CubeIcon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" />
                    {t('nav.products', 'Products')}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Add a new FANUC product to your inventory
                  </p>
                </div>
              </a>

              <a
                href="/admin/orders"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 border border-gray-200 rounded-lg hover:border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                    <ShoppingBagIcon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" />
                    {t('nav.orders', 'Orders')}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    View and manage customer orders
                  </p>
                </div>
              </a>

              <a
                href="/admin/media"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 border border-gray-200 rounded-lg hover:border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-purple-50 text-purple-700 ring-4 ring-white">
                    <PhotoIcon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" />
                    {t('nav.media', 'Media Library')}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Upload and manage site images (deduplicated by hash)
                  </p>
                </div>
              </a>

              <a
                href="/admin/users"
                className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 border border-gray-200 rounded-lg hover:border-gray-300"
              >
                <div>
                  <span className="rounded-lg inline-flex p-3 bg-orange-50 text-orange-700 ring-4 ring-white">
                    <UsersIcon className="h-6 w-6" />
                  </span>
                </div>
                <div className="mt-4">
                  <h3 className="text-lg font-medium">
                    <span className="absolute inset-0" />
                    {t('nav.users', 'All Users')}
                  </h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Manage admin users and permissions
                  </p>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
