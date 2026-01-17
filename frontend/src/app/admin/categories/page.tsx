'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  TagIcon,
  PhotoIcon,
  ArrowsUpDownIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import { CategoryService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import { useAdminI18n } from '@/lib/admin-i18n';

// Categories data now comes from API only

export default function AdminCategoriesPage() {
  const { locale, t } = useAdminI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showMediaPicker, setShowMediaPicker] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image_url: '',
    sort_order: 0,
    is_active: true
  });

  const queryClient = useQueryClient();

  // Fetch categories from API
  const { data: categories = [], isLoading, error } = useQuery({
    queryKey: queryKeys.categories.lists(),
    queryFn: () => CategoryService.getAdminCategories(),
    retry: 1, // Only retry once
  });

  // Use real API data, no fallback to mock data
  const categoriesData = categories;

  // Create category mutation
  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => CategoryService.createCategory(data),
    onSuccess: () => {
      toast.success(t('categories.toast.created', 'Category created successfully!'));
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
      closeDrawer();
      setFormData({ name: '', description: '', image_url: '', sort_order: 0, is_active: true });
    },
    onError: (error: any) => {
      toast.error(error.message || t('categories.toast.createFailed', 'Failed to create category'));
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: (payload: { id: number; data: any }) => CategoryService.updateCategory(payload.id, payload.data),
    onSuccess: () => {
      toast.success(t('categories.toast.updated', 'Category updated successfully!'));
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
      closeDrawer();
      setFormData({ name: '', description: '', image_url: '', sort_order: 0, is_active: true });
    },
    onError: (error: any) => {
      toast.error(error.message || t('categories.toast.updateFailed', 'Failed to update category'));
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => CategoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success(t('categories.toast.deleted', 'Category deleted successfully!'));
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
    },
    onError: (error: any) => {
      toast.error(error.message || t('categories.toast.deleteFailed', 'Failed to delete category'));
    },
  });
  // Populate form when editing
  useEffect(() => {
    if (editingCategory) {
      setFormData({
        name: editingCategory.name || '',
        description: editingCategory.description || '',
        image_url: editingCategory.image_url || '',
        sort_order: editingCategory.sort_order ?? 0,
        is_active: Boolean(editingCategory.is_active),
      });
    }
  }, [editingCategory]);

  const openCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '', description: '', image_url: '', sort_order: 0, is_active: true });
    setDrawerOpen(true);
  };

  const openEdit = (category: any) => {
    setEditingCategory(category);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditingCategory(null);
    setShowMediaPicker(false);
  };

  const sortedCategories = useMemo(() => {
    const list = Array.isArray(categoriesData) ? [...categoriesData] : [];
    list.sort((a: any, b: any) => {
      const ao = Number(a.sort_order ?? 0);
      const bo = Number(b.sort_order ?? 0);
      if (ao !== bo) return ao - bo;
      return String(a.name || '').localeCompare(String(b.name || ''), locale === 'zh' ? 'zh' : 'en');
    });
    return list;
  }, [categoriesData, locale]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sortedCategories.filter((category: any) => {
      const matchesSearch =
        !q ||
        category.name?.toLowerCase().includes(q) ||
        category.description?.toLowerCase().includes(q);
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && category.is_active) ||
        (statusFilter === 'inactive' && !category.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [sortedCategories, searchQuery, statusFilter]);

  const normalizeSortMutation = useMutation({
    mutationFn: async () => {
      for (let i = 0; i < sortedCategories.length; i++) {
        const c: any = sortedCategories[i];
        const desired = i + 1;
        if (Number(c.sort_order ?? 0) === desired) continue;
        // eslint-disable-next-line no-await-in-loop
        await CategoryService.updateCategory(c.id, { sort_order: desired } as any);
      }
    },
    onSuccess: () => {
      toast.success(locale === 'zh' ? '已重置排序' : 'Sort order normalized');
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to normalize sort order');
    },
  });

  const handleDelete = (category: any) => {
    const msg = t('categories.confirm.delete', 'Are you sure you want to delete \"{name}\"? This action cannot be undone.', { name: category.name });
    if (window.confirm(msg)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error(t('categories.toast.nameRequired', 'Category name is required'));
      return;
    }


    if (editingCategory) {
      // Update existing category
      updateCategoryMutation.mutate({
        id: editingCategory.id,
        data: {
          name: formData.name,
          description: formData.description,
          image_url: formData.image_url,
          sort_order: Number(formData.sort_order) || 0,
          is_active: formData.is_active,
        },
      });
    } else {
      // Create new category
      createCategoryMutation.mutate(formData);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  // Show loading state
  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  // Show error state
  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-20">
          <div className="text-red-600 mb-4">
            {locale === 'zh' ? '分类加载失败：' : 'Error loading categories: '}{error instanceof Error ? error.message : (locale === 'zh' ? '未知错误' : 'Unknown error')}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            {t('common.retry', 'Retry')}
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('categories.title', 'Categories')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('categories.subtitle', 'Manage product categories and organization')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const msg = locale === 'zh' ? '确定要把分类排序重置为 1..N 吗？' : 'Normalize sort order to 1..N?';
                if (!window.confirm(msg)) return;
                normalizeSortMutation.mutate();
              }}
              disabled={normalizeSortMutation.isPending || sortedCategories.length === 0}
              className="inline-flex items-center px-4 py-2 border border-gray-200 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <ArrowsUpDownIcon className="h-4 w-4 mr-2" />
              {t('categories.sort.normalize', 'Normalize Sort')}
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              {t('categories.add', 'Add Category')}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Search */}
            <div className="sm:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                {t('categories.search', 'Search Categories')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  placeholder={locale === 'zh' ? '按名称/描述搜索...' : 'Search by name or description...'}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                {t('categories.status', 'Status')}
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">{t('categories.all', 'All')}</option>
                <option value="active">{t('categories.active', 'Active')}</option>
                <option value="inactive">{t('categories.inactive', 'Inactive')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCategories.map((category) => (
            <div key={category.id} className="bg-white shadow rounded-lg overflow-hidden">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      {category.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="h-10 w-10 rounded-lg object-cover border border-gray-200"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TagIcon className="h-6 w-6 text-blue-600" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          category.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {category.is_active ? t('categories.active', 'Active') : t('categories.inactive', 'Inactive')}
                        </span>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                          sort {Number((category as any).sort_order ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openEdit(category)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(category)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {category.description && (
                    <p className="text-sm text-gray-600">{category.description}</p>
                  )}

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{t('categories.products', 'Products')}</span>
                    <span className="font-medium text-gray-900">{(category as any).product_count || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{t('categories.created', 'Created')}</span>
                    <span className="text-gray-900">
                      {new Date(category.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => openEdit(category)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    {t('categories.edit', 'Edit')}
                  </button>
                  <span className="text-xs text-gray-500">
                    ID: {category.id}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-12">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">{t('categories.empty.title', 'No categories found')}</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? t('categories.empty.filtered', 'Try adjusting your search or filter criteria.')
                : t('categories.empty.fresh', 'Get started by creating your first category.')
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={openCreate}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Category
                </button>
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{t('categories.stats.title', 'Category Statistics')}</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{categoriesData.length}</div>
              <div className="text-sm text-gray-500">{t('categories.stats.total', 'Total Categories')}</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {categoriesData.filter(c => c.is_active).length}
              </div>
              <div className="text-sm text-gray-500">{t('categories.stats.active', 'Active Categories')}</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {categoriesData.reduce((sum, c) => sum + ((c as any).product_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">{t('categories.stats.totalProducts', 'Total Products')}</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {categoriesData.length > 0 ? Math.round(categoriesData.reduce((sum, c) => sum + ((c as any).product_count || 0), 0) / categoriesData.length) : 0}
              </div>
              <div className="text-sm text-gray-500">{t('categories.stats.avgProducts', 'Avg Products/Category')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Drawer (no navigation) */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gray-600/50" onClick={closeDrawer} />
          <div className="absolute inset-y-0 right-0 w-full max-w-xl bg-white shadow-xl overflow-y-auto">
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-gray-200">
              <div>
                <div className="text-lg font-semibold text-gray-900">
                  {editingCategory ? t('categories.drawer.editTitle', 'Edit Category') : t('categories.drawer.createTitle', 'Create Category')}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {t('categories.drawer.hint', 'Edit in this panel; list will refresh after saving.')}
                </div>
              </div>
              <button onClick={closeDrawer} className="p-2 rounded-md hover:bg-gray-50 text-gray-500" title={locale === 'zh' ? '关闭' : 'Close'}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <form id="category-form" onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('categories.field.name', 'Category Name')} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={locale === 'zh' ? '例如：Servo Drives' : 'e.g., Servo Drives'}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('categories.field.description', 'Description')}
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={locale === 'zh' ? '分类描述…' : 'Category description...'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('categories.field.image', 'Category Image')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="image_url"
                      value={formData.image_url}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={locale === 'zh' ? '外链或 /uploads/...' : 'External URL or /uploads/...'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowMediaPicker(true)}
                      className="inline-flex items-center px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PhotoIcon className="h-4 w-4 mr-1" />
                      {t('categories.image.choose', 'Choose')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((p) => ({ ...p, image_url: '' }))}
                      className="px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {t('categories.image.clear', 'Clear')}
                    </button>
                  </div>
                  {formData.image_url ? (
                    <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={formData.image_url} alt="preview" className="w-full h-auto" />
                    </div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('categories.field.sortOrder', 'Sort Order')}
                    </label>
                    <input
                      type="number"
                      name="sort_order"
                      value={formData.sort_order}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      min={0}
                      max={9999}
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {t('categories.field.sortHint', 'Smaller numbers appear first.')}
                    </p>
                  </div>

                  <div className="flex items-center mt-6">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={handleInputChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-900">
                      {t('categories.field.isActive', 'Active')}
                    </label>
                  </div>
                </div>
              </form>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDrawer}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                form="category-form"
                disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {(createCategoryMutation.isPending || updateCategoryMutation.isPending)
                  ? (editingCategory ? t('common.saving', 'Saving...') : t('common.creating', 'Creating...'))
                  : (editingCategory ? t('common.save', 'Save') : t('common.create', 'Create'))}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <MediaPickerModal
        open={showMediaPicker}
        onClose={() => setShowMediaPicker(false)}
        multiple={false}
        title={locale === 'zh' ? '从图库选择分类图片' : 'Select category image'}
        onSelect={(assets) => {
          if (assets[0]) {
            setFormData((p) => ({ ...p, image_url: assets[0].url }));
            toast.success(locale === 'zh' ? '已选择图片' : 'Image selected');
          }
        }}
      />
    </AdminLayout>
  );
}
