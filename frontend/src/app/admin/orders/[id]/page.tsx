'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { OrderService } from '@/services';
import { queryKeys } from '@/lib/react-query';
import { formatCurrency } from '@/lib/utils';

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = parseInt(params.id as string);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const queryClient = useQueryClient();

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => OrderService.getOrder(orderId),
    enabled: !!orderId,
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: (status: string) => OrderService.updateOrderStatus(orderId, status),
    onSuccess: () => {
      toast.success('Order status updated successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update order status');
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: () => OrderService.deleteOrder(orderId),
    onSuccess: () => {
      toast.success('Order deleted successfully!');
      window.location.href = '/admin/orders';
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete order');
    },
  });

  const handleStatusUpdate = (newStatus: string) => {
    updateOrderStatusMutation.mutate(newStatus);
  };

  const handleDeleteOrder = () => {
    deleteOrderMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
      processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: ClockIcon },
      shipped: { label: 'Shipped', color: 'bg-indigo-100 text-indigo-800', icon: TruckIcon },
      delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircleIcon },
    };

    const config = statusConfig[status as keyof typeof statusConfig] ||
                   { label: status, color: 'bg-gray-100 text-gray-800', icon: ClockIcon };

    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <Icon className="h-4 w-4 mr-1.5" />
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: 'Paid', color: 'bg-green-100 text-green-800' },
      failed: { label: 'Failed', color: 'bg-red-100 text-red-800' },
      refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-800' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] ||
                   { label: status, color: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-500">Loading order details...</p>
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order Not Found</h3>
          <p className="text-gray-500 mb-4">
            {error?.message || 'The order you are looking for does not exist.'}
          </p>
          <Link
            href="/admin/orders"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Orders
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/admin/orders"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Orders
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Order #{order.order_number}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Order details and management
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {OrderService.canEditOrder(order) && (
              <Link
                href={`/admin/orders/${order.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                Edit Order
              </Link>
            )}
            {OrderService.canDeleteOrder(order) && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                Delete Order
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Status
                  </label>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(order.status)}
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                      disabled={updateOrderStatusMutation.isPending}
                      className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <div>
                    {getPaymentStatusBadge(order.payment_status || 'pending')}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.product?.name || `Product ID: ${item.product_id}`}
                      </h4>
                      <p className="text-sm text-gray-500">
                        SKU: {item.product?.sku || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Total: {formatCurrency(item.total_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="font-medium text-gray-900">Order Total:</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Notes</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                  <div>
                    <p className="text-gray-700">{order.customer_email}</p>
                  </div>
                </div>
                {order.customer_phone && (
                  <div className="flex items-center">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    <div>
                      <p className="text-gray-700">{order.customer_phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Addresses */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Addresses</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="flex items-center font-medium text-gray-900 mb-2">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    Shipping Address
                  </h4>
                  <p className="text-gray-700 text-sm whitespace-pre-line">
                    {order.shipping_address}
                  </p>
                </div>
                <div>
                  <h4 className="flex items-center font-medium text-gray-900 mb-2">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    Billing Address
                  </h4>
                  <p className="text-gray-700 text-sm whitespace-pre-line">
                    {order.billing_address}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Timeline</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Order Created:</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="font-medium">
                    {new Date(order.updated_at).toLocaleDateString()} {new Date(order.updated_at).toLocaleTimeString()}
                  </span>
                </div>
                {order.payment_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment ID:</span>
                    <span className="font-medium font-mono text-xs">
                      {order.payment_id}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">Delete Order</h3>
              </div>
              <p className="text-gray-500 mb-6">
                Are you sure you want to delete order <strong>#{order.order_number}</strong>?
                This action cannot be undone.
                {order.payment_status === 'paid' && (
                  <span className="block mt-2 text-orange-600 font-medium">
                    Note: This order has been paid. Product stock will be restored.
                  </span>
                )}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleteOrderMutation.isPending}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteOrder}
                  disabled={deleteOrderMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {deleteOrderMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Deleting...
                    </>
                  ) : (
                    'Delete Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}