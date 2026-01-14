'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { apiClient } from '@/lib/api';

interface Customer {
  id: number;
  email: string;
  full_name: string;
  phone?: string;
  company?: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login_at?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadCustomers();
  }, [page, searchTerm, statusFilter]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const params: any = { page, page_size: 20 };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await apiClient.get('/admin/customers', { params });
      if (response.data.success) {
        setCustomers(response.data.data.data || []);
        setTotalPages(response.data.data.total_pages || 1);
      }
    } catch (error: any) {
      console.error('Failed to load customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const toggleCustomerStatus = async (customerId: number, currentStatus: boolean) => {
    try {
      const response = await apiClient.put(`/admin/customers/${customerId}/status`, {
        is_active: !currentStatus,
      });

      if (response.data.success) {
        toast.success(`Customer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
        loadCustomers();
      }
    } catch (error: any) {
      toast.error('Failed to update customer status');
    }
  };

  const deleteCustomer = async (customerId: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      await apiClient.delete(`/admin/customers/${customerId}`);
      toast.success('Customer deleted successfully');
      loadCustomers();
    } catch (error: any) {
      toast.error('Failed to delete customer');
    }
  };

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
            <p className="mt-2 text-sm text-gray-700">
              Manage all registered customers and their accounts
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="block w-full rounded-md border-gray-300 pl-10 focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
                placeholder="Search by name, email, or phone..."
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full sm:w-48">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="block w-full rounded-md border-gray-300 focus:border-amber-500 focus:ring-amber-500 sm:text-sm"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="mt-8 flex flex-col">
          <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
            <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                {loading ? (
                  <div className="text-center py-12 bg-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto"></div>
                    <p className="mt-4 text-sm text-gray-500">Loading customers...</p>
                  </div>
                ) : customers.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                          Customer
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Contact
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Status
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Registered
                        </th>
                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          Last Login
                        </th>
                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {customers.map((customer) => (
                        <tr key={customer.id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                            <div className="flex items-center">
                              <div className="h-10 w-10 flex-shrink-0">
                                <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                                  <UserGroupIcon className="h-6 w-6 text-amber-600" />
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">{customer.full_name}</div>
                                <div className="text-gray-500">{customer.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            <div>{customer.phone || '-'}</div>
                            <div className="text-gray-400">{customer.company || '-'}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                customer.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {customer.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {new Date(customer.created_at).toLocaleDateString()}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {customer.last_login_at
                              ? new Date(customer.last_login_at).toLocaleDateString()
                              : 'Never'}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <button
                              onClick={() => toggleCustomerStatus(customer.id, customer.is_active)}
                              className="text-amber-600 hover:text-amber-900 mr-4"
                            >
                              {customer.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => deleteCustomer(customer.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12 bg-white">
                    <UserGroupIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {searchTerm || statusFilter !== 'all'
                        ? 'Try adjusting your search or filter.'
                        : 'No customers have registered yet.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{page}</span> of{' '}
                  <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
