'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  EyeIcon,
  XCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { BannerService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import { useAdminI18n } from '@/lib/admin-i18n';

export default function AdminBannersPage() {
  const { t } = useAdminI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const queryClient = useQueryClient();

  // Fetch banners from API
  const { data: bannersData, isLoading, error } = useQuery({
    // Use existing key factory; admin banners list
    queryKey: [...queryKeys.banners.admin(), 'list'],
    queryFn: () => BannerService.getBanners(),
  });

  const banners = (bannersData || []).filter((b: any) => {
    const matchesSearch = !searchQuery ||
      b.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.subtitle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPosition = !positionFilter || b.position === positionFilter;
    const matchesStatus = !statusFilter || String(b.is_active) === statusFilter;
    return matchesSearch && matchesPosition && matchesStatus;
  });

  // Delete banner mutation
  const deleteBannerMutation = useMutation({
    mutationFn: (bannerId: number) => BannerService.deleteBanner(bannerId),
    onSuccess: () => {
      toast.success(t('banners.toast.deleted', { en: 'Banner deleted successfully!', zh: '横幅已删除！' }));
      queryClient.invalidateQueries({ queryKey: [...queryKeys.banners.admin(), 'list'] });
    },
    onError: (error: any) => {
      toast.error(error.message || t('banners.toast.deleteFailed', { en: 'Failed to delete banner', zh: '删除横幅失败' }));
    },
  });

  // Toggle banner status mutation (backend requires full update, so send current fields)
  const toggleBannerStatusMutation = useMutation({
    mutationFn: ({ banner }: { banner: any }) =>
      BannerService.updateBanner(banner.id, {
        title: banner.title,
        subtitle: banner.subtitle,
        image_url: banner.image_url,
        link_url: banner.link_url,
        content_type: banner.content_type,
        category_key: banner.category_key,
        sort_order: banner.sort_order,
        is_active: !banner.is_active,
      }),
    onSuccess: () => {
      toast.success(t('banners.toast.statusUpdated', { en: 'Banner status updated successfully!', zh: '横幅状态已更新！' }));
      queryClient.invalidateQueries({ queryKey: [...queryKeys.banners.admin(), 'list'] });
    },
    onError: (error: any) => {
      toast.error(error.message || t('banners.toast.statusUpdateFailed', { en: 'Failed to update banner status', zh: '更新横幅状态失败' }));
    },
  });

  const handleDeleteBanner = (bannerId: number, title: string) => {
    if (window.confirm(
      t(
        'banners.confirm.delete',
        {
          en: 'Are you sure you want to delete banner "{title}"? This action cannot be undone.',
          zh: '确定要删除横幅“{title}”吗？此操作不可撤销。',
        },
        { title }
      )
    )) {
      deleteBannerMutation.mutate(bannerId);
    }
  };

  const handleToggleStatus = (banner: any) => {
    toggleBannerStatusMutation.mutate({ banner });
  };

  const getPositionBadge = (position: string) => {
    const positionConfig = {
      home: { label: t('banners.position.home', { en: 'Home', zh: '首页' }), color: 'bg-blue-100 text-blue-800' },
      products: { label: t('banners.position.products', { en: 'Products', zh: '产品页' }), color: 'bg-green-100 text-green-800' },
      about: { label: t('banners.position.about', { en: 'About', zh: '关于' }), color: 'bg-purple-100 text-purple-800' },
      contact: { label: t('banners.position.contact', { en: 'Contact', zh: '联系' }), color: 'bg-orange-100 text-orange-800' },
    };

    const config = positionConfig[position as keyof typeof positionConfig] || 
                   { label: position, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircleIcon className="h-3 w-3 mr-1" />
		{t('common.active', { en: 'Active', zh: '启用' })}
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <XCircleIcon className="h-3 w-3 mr-1" />
		{t('common.inactive', { en: 'Inactive', zh: '停用' })}
      </span>
    );
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('banners.error.title', { en: 'Error Loading Banners', zh: '横幅加载失败' })}
          </h3>
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
            <h1 className="text-2xl font-bold text-gray-900">{t('banners.title', { en: 'Banners', zh: '横幅管理' })}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('banners.subtitle', { en: 'Manage website banners and promotional content', zh: '管理网站横幅与促销内容' })}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              {t('common.filters', { en: 'Filters', zh: '筛选' })}
            </button>
            <Link
              href="/admin/banners/new"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('banners.add', { en: 'Add Banner', zh: '新增横幅' })}
            </Link>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white p-4 rounded-lg shadow border">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.search', { en: 'Search', zh: '搜索' })}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    id="search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('banners.searchPh', { en: 'Title, subtitle, or description...', zh: '标题、副标题或描述...' })}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('banners.field.position', { en: 'Position', zh: '位置' })}
                </label>
                <select
                  id="position"
                  value={positionFilter}
                  onChange={(e) => setPositionFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('banners.position.all', { en: 'All Positions', zh: '全部位置' })}</option>
                  <option value="home">{t('banners.position.home', { en: 'Home', zh: '首页' })}</option>
                  <option value="products">{t('banners.position.products', { en: 'Products', zh: '产品页' })}</option>
                  <option value="about">{t('banners.position.about', { en: 'About', zh: '关于' })}</option>
                  <option value="contact">{t('banners.position.contact', { en: 'Contact', zh: '联系' })}</option>
                </select>
              </div>

              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.status', { en: 'Status', zh: '状态' })}
                </label>
                <select
                  id="status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{t('common.all', { en: 'All Statuses', zh: '全部' })}</option>
                  <option value="true">{t('common.active', { en: 'Active', zh: '启用' })}</option>
                  <option value="false">{t('common.inactive', { en: 'Inactive', zh: '停用' })}</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPositionFilter('');
                    setStatusFilter('');
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  {t('common.clearFilters', { en: 'Clear Filters', zh: '清除筛选' })}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Banners Grid */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">{t('banners.loading', { en: 'Loading banners...', zh: '正在加载横幅...' })}</p>
            </div>
          ) : banners.length === 0 ? (
            <div className="p-8 text-center">
              <PhotoIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('banners.empty', { en: 'No banners found', zh: '没有找到横幅' })}</h3>
              <p className="text-gray-500">
                {searchQuery || positionFilter || statusFilter
                  ? t('banners.empty.filtered', { en: 'Try adjusting your filters to see more banners.', zh: '请尝试调整筛选条件。' })
                  : t('banners.empty.fresh', { en: 'Get started by creating your first banner.', zh: '从创建第一个横幅开始吧。' })}
              </p>
              {!searchQuery && !positionFilter && !statusFilter && (
                <div className="mt-6">
                  <Link
                    href="/admin/banners/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <PlusIcon className="h-4 w-4 mr-2" />
                    {t('banners.add', { en: 'Add Banner', zh: '新增横幅' })}
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 p-6">
              {banners.map((banner: any) => (
                <div key={banner.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                  {/* Banner Image */}
                  <div className="aspect-w-16 aspect-h-9 bg-gray-200">
                    <img
                      src={banner.image_url}
                      alt={banner.title}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder-banner.jpg';
                      }}
                    />
                  </div>

                  {/* Banner Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {banner.title}
                      </h3>
                      {getStatusBadge(banner.is_active)}
                    </div>

                    {banner.subtitle && (
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {banner.subtitle}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      {getPositionBadge(banner.position)}
                      <span className="text-xs text-gray-500">
                        {t(
                          'banners.field.sortOrderLine',
                          { en: 'Order: {order}', zh: '排序：{order}' },
                          { order: banner.sort_order }
                        )}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleToggleStatus(banner)}
                          disabled={toggleBannerStatusMutation.isPending}
                          className={`inline-flex items-center px-2 py-1 border border-gray-300 rounded text-xs font-medium ${
                            banner.is_active 
                              ? 'text-red-700 bg-red-50 hover:bg-red-100' 
                              : 'text-green-700 bg-green-50 hover:bg-green-100'
                          }`}
                        >
                          {banner.is_active
                            ? t('common.deactivate', { en: 'Deactivate', zh: '停用' })
                            : t('common.activate', { en: 'Activate', zh: '启用' })}
                        </button>
                      </div>

                      <div className="flex items-center space-x-1">
                        <Link
                          href={`/admin/banners/${banner.id}`}
                          className="inline-flex items-center p-1 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/banners/${banner.id}/edit`}
                          className="inline-flex items-center p-1 border border-gray-300 rounded text-gray-700 bg-white hover:bg-gray-50"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDeleteBanner(banner.id, banner.title)}
                          disabled={deleteBannerMutation.isPending}
                          className="inline-flex items-center p-1 border border-red-300 rounded text-red-700 bg-red-50 hover:bg-red-100"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
