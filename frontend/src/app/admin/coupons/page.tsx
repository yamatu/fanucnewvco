'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  CouponService,
  Coupon,
  CouponFilters
} from '@/services/coupon.service';
import { PaginationResponse } from '@/types';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<PaginationResponse<Coupon> | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [filters, setFilters] = useState<CouponFilters>({
    page: 1,
    page_size: 10,
    search: '',
    status: undefined
  });

  const fetchCoupons = async () => {
    try {
      const data = await CouponService.getCoupons(filters);
      setCoupons(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch coupons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [filters]);

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;

    setDeleting(id);
    try {
      await CouponService.deleteCoupon(id);
      toast.success('Coupon deleted successfully');
      fetchCoupons();
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete coupon');
    } finally {
      setDeleting(null);
    }
  };

  const handleSearch = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }));
  };

  const handleStatusFilter = (status: string) => {
    setFilters(prev => ({
      ...prev,
      status: status === 'all' ? undefined : status as CouponFilters['status'],
      page: 1
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getStatusBadge = (coupon: Coupon) => {
    const status = CouponService.getCouponStatus(coupon);
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800',
      scheduled: 'bg-blue-100 text-blue-800',
      exhausted: 'bg-orange-100 text-orange-800'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[status.status as keyof typeof colors] || colors.inactive}`}>
        {status.label}
      </span>
    );
  };

  const getUsageProgress = (coupon: Coupon) => {
    if (!coupon.usage_limit) return null;

    const percentage = (coupon.used_count / coupon.usage_limit) * 100;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full"
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <TagIcon className="h-8 w-8 text-amber-600" />
            <h1 className="text-2xl font-bold text-gray-900">Coupon Management</h1>
          </div>
          <Link
            href="/admin/coupons/new"
            className="bg-amber-600 text-white px-4 py-2 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>Create Coupon</span>
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search coupons..."
                value={filters.search || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>

            {/* Page Size */}
            <select
              value={filters.page_size || 10}
              onChange={(e) => setFilters(prev => ({ ...prev, page_size: parseInt(e.target.value), page: 1 }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white shadow-sm rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading coupons...</p>
            </div>
          ) : coupons && coupons.data.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Code & Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type & Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usage
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Dates
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {coupons.data.map((coupon) => (
                      <tr key={coupon.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {coupon.code}
                            </div>
                            <div className="text-sm text-gray-500">
                              {coupon.name}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {CouponService.getDiscountDescription(coupon)}
                          </div>
                          <div className="text-sm text-gray-500">
                            Min: ${coupon.min_order_amount}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(coupon)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {coupon.used_count} / {coupon.usage_limit || '∞'}
                          </div>
                          {getUsageProgress(coupon)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div>
                            {coupon.starts_at ? new Date(coupon.starts_at).toLocaleDateString() : 'No start date'}
                          </div>
                          <div>
                            {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString() : 'No expiry'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/admin/coupons/${coupon.id}`}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </Link>
                            <Link
                              href={`/admin/coupons/${coupon.id}/edit`}
                              className="text-amber-600 hover:text-amber-900"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Link>
                            <button
                              onClick={() => handleDelete(coupon.id)}
                              disabled={deleting === coupon.id}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              title="Delete"
                            >
                              {deleting === coupon.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <TrashIcon className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {coupons.total_pages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(Math.max(1, filters.page! - 1))}
                      disabled={filters.page === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(Math.min(coupons.total_pages, filters.page! + 1))}
                      disabled={filters.page === coupons.total_pages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {(filters.page! - 1) * filters.page_size! + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(filters.page! * filters.page_size!, coupons.total)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">{coupons.total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(Math.max(1, filters.page! - 1))}
                          disabled={filters.page === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {Array.from({ length: Math.min(5, coupons.total_pages) }, (_, i) => {
                          const page = i + 1;
                          return (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                filters.page === page
                                  ? 'z-10 bg-amber-50 border-amber-500 text-amber-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        })}
                        <button
                          onClick={() => handlePageChange(Math.min(coupons.total_pages, filters.page! + 1))}
                          disabled={filters.page === coupons.total_pages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-6 text-center">
              <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No coupons</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a new coupon.
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/coupons/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                >
                  <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
                  Create Coupon
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}