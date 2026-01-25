'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import {
  ArrowLeftIcon,
  XCircleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { OrderService } from '@/services';
import { queryKeys } from '@/lib/react-query';

const orderSchema = yup.object().shape({
  customer_name: yup.string().required('Customer name is required'),
  customer_email: yup.string().email('Invalid email').required('Customer email is required'),
  customer_phone: yup.string(),
  shipping_address: yup.string().required('Shipping address is required'),
  billing_address: yup.string().required('Billing address is required'),
  status: yup.string().required('Order status is required'),
  payment_status: yup.string().required('Payment status is required'),
  tracking_number: yup.string(),
  shipping_carrier: yup.string(),
  notify_shipped: yup.boolean(),
  notes: yup.string(),
});

export default function OrderEditPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = parseInt(params.id as string);
  const queryClient = useQueryClient();

  // Fetch order details
  const { data: order, isLoading, error } = useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => OrderService.getOrder(orderId),
    enabled: !!orderId,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isDirty }
  } = useForm({
    resolver: yupResolver(orderSchema),
  });

  const trackingValue = watch('tracking_number');
  useEffect(() => {
    // When tracking becomes non-empty, default to notify customer.
    if (typeof trackingValue === 'string' && trackingValue.trim() !== '') {
      setValue('notify_shipped', true, { shouldDirty: true });
    }
  }, [trackingValue, setValue]);

  // Reset form when order data is loaded
  useEffect(() => {
    if (order) {
      reset({
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_phone: order.customer_phone || '',
        shipping_address: order.shipping_address,
        billing_address: order.billing_address,
        tracking_number: (order as any).tracking_number || '',
        shipping_carrier: (order as any).shipping_carrier || '',
        notify_shipped: false,
        status: order.status,
        payment_status: order.payment_status || 'pending',
        notes: order.notes || '',
      });
    }
  }, [order, reset]);

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: (data: any) => OrderService.updateOrder(orderId, data),
    onSuccess: () => {
      toast.success('Order updated successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      router.push(`/admin/orders/${orderId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update order');
    },
  });

  const onSubmit = (data: any) => {
    updateOrderMutation.mutate(data);
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

  if (!OrderService.canEditOrder(order)) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-yellow-600 mb-4">
            <XCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order Cannot Be Edited</h3>
          <p className="text-gray-500 mb-4">
            This order has been delivered or cancelled and cannot be modified.
          </p>
          <Link
            href={`/admin/orders/${orderId}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            Back to Order Details
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
              href={`/admin/orders/${orderId}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              Back to Order
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Edit Order #{order.order_number}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Modify order information and status
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    id="customer_name"
                    {...register('customer_name')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.customer_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.customer_name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Email *
                  </label>
                  <input
                    type="email"
                    id="customer_email"
                    {...register('customer_email')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.customer_email && (
                    <p className="mt-1 text-sm text-red-600">{errors.customer_email.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Phone
                  </label>
                  <input
                    type="tel"
                    id="customer_phone"
                    {...register('customer_phone')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Order Status */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Order Status</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Order Status *
                  </label>
                  <select
                    id="status"
                    {...register('status')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Status *
                  </label>
                  <select
                    id="payment_status"
                    {...register('payment_status')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  {errors.payment_status && (
                    <p className="mt-1 text-sm text-red-600">{errors.payment_status.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="shipping_carrier" className="block text-sm font-medium text-gray-700 mb-1">
                      Shipping Carrier
                    </label>
                    <input
                      type="text"
                      id="shipping_carrier"
                      {...register('shipping_carrier')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="DHL / FedEx / UPS..."
                    />
                  </div>
                  <div>
                    <label htmlFor="tracking_number" className="block text-sm font-medium text-gray-700 mb-1">
                      Tracking Number
                    </label>
                    <input
                      type="text"
                      id="tracking_number"
                      {...register('tracking_number')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="物流单号"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" {...register('notify_shipped')} className="h-4 w-4" />
                  Email customer a shipping notification
                </label>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Addresses</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label htmlFor="shipping_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Shipping Address *
                </label>
                <textarea
                  id="shipping_address"
                  rows={4}
                  {...register('shipping_address')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.shipping_address && (
                  <p className="mt-1 text-sm text-red-600">{errors.shipping_address.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="billing_address" className="block text-sm font-medium text-gray-700 mb-1">
                  Billing Address *
                </label>
                <textarea
                  id="billing_address"
                  rows={4}
                  {...register('billing_address')}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.billing_address && (
                  <p className="mt-1 text-sm text-red-600">{errors.billing_address.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Order Notes</h3>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                {...register('notes')}
                placeholder="Add any additional notes about this order..."
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3">
            <Link
              href={`/admin/orders/${orderId}`}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={updateOrderMutation.isPending || !isDirty}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateOrderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Update Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
