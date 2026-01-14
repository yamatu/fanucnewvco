'use client';

import { useState } from 'react';
import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { CategoryService } from '@/services';
import { queryKeys } from '@/lib/react-query';

// Categories data now comes from API only

export default function AdminCategoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);

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
      toast.success('Category created successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
      setShowCreateModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', image_url: '', sort_order: 0, is_active: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create category');
    },
  });

  // Update category mutation
  const updateCategoryMutation = useMutation({
    mutationFn: (payload: { id: number; data: any }) => CategoryService.updateCategory(payload.id, payload.data),
    onSuccess: () => {
      toast.success('Category updated successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
      setShowCreateModal(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', image_url: '', sort_order: 0, is_active: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update category');
    },
  });

  // Delete category mutation
  const deleteCategoryMutation = useMutation({
    mutationFn: (id: number) => CategoryService.deleteCategory(id),
    onSuccess: () => {
      toast.success('Category deleted successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.categories.lists() });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete category');
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

  // Reset form when opening create modal
  useEffect(() => {
    if (showCreateModal && !editingCategory) {
      setFormData({ name: '', description: '', image_url: '', sort_order: 0, is_active: true });
    }
  }, [showCreateModal, editingCategory]);

  const filteredCategories = categoriesData.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         category.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && category.is_active) ||
                         (statusFilter === 'inactive' && !category.is_active);

    return matchesSearch && matchesStatus;
  });

  const handleDelete = (category: any) => {
    if (window.confirm(`Are you sure you want to delete "${category.name}"? This action cannot be undone.`)) {
      deleteCategoryMutation.mutate(category.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Category name is required');
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
    console.log('Input changed:', { name, value: newValue, type });

    setFormData(prev => {
      const newData = { ...prev, [name]: newValue };
      console.log('Updated form data:', newData);
      return newData;
    });
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
            Error loading categories: {error instanceof Error ? error.message : 'Unknown error'}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            Retry
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
            <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage product categories and organization
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Category
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {/* Search */}
            <div className="sm:col-span-2">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Search Categories
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
                  placeholder="Search by name or description..."
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
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
                      <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <TagIcon className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        category.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {category.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setEditingCategory(category)}
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
                    <span className="text-gray-500">Products</span>
                    <span className="font-medium text-gray-900">{(category as any).product_count || 0}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Created</span>
                    <span className="text-gray-900">
                      {new Date(category.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-6 py-3">
                <div className="flex justify-between items-center">
                  <button
                    onClick={() => setEditingCategory(category)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-500"
                  >
                    Edit Category
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
            <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by creating your first category.'
              }
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Category Statistics</h3>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{categoriesData.length}</div>
              <div className="text-sm text-gray-500">Total Categories</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {categoriesData.filter(c => c.is_active).length}
              </div>
              <div className="text-sm text-gray-500">Active Categories</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {categoriesData.reduce((sum, c) => sum + ((c as any).product_count || 0), 0)}
              </div>
              <div className="text-sm text-gray-500">Total Products</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {categoriesData.length > 0 ? Math.round(categoriesData.reduce((sum, c) => sum + ((c as any).product_count || 0), 0) / categoriesData.length) : 0}
              </div>
              <div className="text-sm text-gray-500">Avg Products/Category</div>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal would go here */}
      {(showCreateModal || editingCategory) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingCategory ? 'Edit Category' : 'Create New Category'}
              </h3>

              <form id="category-form" onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Servo Drives"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Category description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL
                  </label>
                  <input
                    type="url"
                    name="image_url"
                    value={formData.image_url}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">可填写外链图片 URL，前台分类卡片会展示该图片。</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sort Order
                    </label>
                    <input
                      type="number"
                      name="sort_order"
                      value={formData.sort_order}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
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
                      Active
                    </label>
                  </div>
                </div>
              </form>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingCategory(null);
                    setFormData({ name: '', description: '', image_url: '', sort_order: 0, is_active: true });
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="category-form"
                  disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {(createCategoryMutation.isPending || updateCategoryMutation.isPending) ? (editingCategory ? 'Updating...' : 'Creating...') : (editingCategory ? 'Update' : 'Create')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
