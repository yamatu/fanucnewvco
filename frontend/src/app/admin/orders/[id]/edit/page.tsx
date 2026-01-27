'use client';

import { useEffect, useMemo } from 'react';
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
import { useAdminI18n } from '@/lib/admin-i18n';

export default function OrderEditPage() {
  const { locale, t } = useAdminI18n();
  const params = useParams();
  const router = useRouter();
  const orderId = parseInt(params.id as string);
  const queryClient = useQueryClient();

  const orderSchema = useMemo(
    () =>
      yup.object().shape({
        customer_name: yup.string().required(t('orders.edit.validation.customerName', locale === 'zh' ? '请输入客户姓名' : 'Customer name is required')),
        customer_email: yup
          .string()
          .email(t('orders.edit.validation.emailInvalid', locale === 'zh' ? '邮箱格式不正确' : 'Invalid email'))
          .required(t('orders.edit.validation.customerEmail', locale === 'zh' ? '请输入客户邮箱' : 'Customer email is required')),
        customer_phone: yup.string(),
        shipping_address: yup.string().required(t('orders.edit.validation.shipAddr', locale === 'zh' ? '请输入收货地址' : 'Shipping address is required')),
        billing_address: yup.string().required(t('orders.edit.validation.billAddr', locale === 'zh' ? '请输入账单地址' : 'Billing address is required')),
        status: yup.string().required(t('orders.edit.validation.status', locale === 'zh' ? '请选择订单状态' : 'Order status is required')),
        payment_status: yup.string().required(t('orders.edit.validation.payStatus', locale === 'zh' ? '请选择支付状态' : 'Payment status is required')),
        tracking_number: yup.string(),
        shipping_carrier: yup.string(),
        notify_shipped: yup.boolean(),
        notes: yup.string(),
      }),
    [locale, t]
  );

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
      toast.success(t('orders.edit.toast.updated', locale === 'zh' ? '订单已更新！' : 'Order updated successfully!'));
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
      router.push(`/admin/orders/${orderId}`);
    },
    onError: (error: any) => {
      toast.error(error.message || t('orders.edit.toast.updateFailed', locale === 'zh' ? '更新订单失败' : 'Failed to update order'));
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
          <p className="mt-2 text-gray-500">{t('orders.loading', locale === 'zh' ? '正在加载订单详情...' : 'Loading order details...')}</p>
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t('orders.notFound', locale === 'zh' ? '未找到订单' : 'Order Not Found')}</h3>
          <p className="text-gray-500 mb-4">
            {error?.message || t('orders.notFound.desc', locale === 'zh' ? '你要查看的订单不存在。' : 'The order you are looking for does not exist.')}
          </p>
          <Link
            href="/admin/orders"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t('orders.back', locale === 'zh' ? '返回订单列表' : 'Back to Orders')}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {t('orders.edit.notAllowed.title', locale === 'zh' ? '订单不可编辑' : 'Order Cannot Be Edited')}
          </h3>
          <p className="text-gray-500 mb-4">
            {t(
              'orders.edit.notAllowed.desc',
              locale === 'zh' ? '该订单已送达或已取消，无法再修改。' : 'This order has been delivered or cancelled and cannot be modified.'
            )}
          </p>
          <Link
            href={`/admin/orders/${orderId}`}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-2" />
            {t('orders.backToDetail', locale === 'zh' ? '返回订单详情' : 'Back to Order Details')}
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
              {t('orders.backToDetail', locale === 'zh' ? '返回订单详情' : 'Back to Order')}
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('orders.edit.title', locale === 'zh' ? '编辑订单 #{orderNumber}' : 'Edit Order #{orderNumber}', { orderNumber: order.order_number })}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('orders.edit.subtitle', locale === 'zh' ? '修改订单信息与状态' : 'Modify order information and status')}
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.customer', locale === 'zh' ? '客户信息' : 'Customer Information')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.field.customerName', locale === 'zh' ? '客户姓名 *' : 'Customer Name *')}
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
                    {t('orders.field.customerEmail', locale === 'zh' ? '客户邮箱 *' : 'Customer Email *')}
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
                    {t('orders.field.customerPhone', locale === 'zh' ? '客户电话' : 'Customer Phone')}
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.detail.statusBlock', locale === 'zh' ? '订单状态' : 'Order Status')}</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.status.title', locale === 'zh' ? '订单状态 *' : 'Order Status *')}
                  </label>
                  <select
                    id="status"
                    {...register('status')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">{t('orders.status.pending', locale === 'zh' ? '待处理' : 'Pending')}</option>
                    <option value="confirmed">{t('orders.status.confirmed', locale === 'zh' ? '已确认' : 'Confirmed')}</option>
                    <option value="processing">{t('orders.status.processing', locale === 'zh' ? '处理中' : 'Processing')}</option>
                    <option value="shipped">{t('orders.status.shipped', locale === 'zh' ? '已发货' : 'Shipped')}</option>
                    <option value="delivered">{t('orders.status.delivered', locale === 'zh' ? '已送达' : 'Delivered')}</option>
                    <option value="cancelled">{t('orders.status.cancelled', locale === 'zh' ? '已取消' : 'Cancelled')}</option>
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="payment_status" className="block text-sm font-medium text-gray-700 mb-1">
                    {t('orders.pay.title', locale === 'zh' ? '支付状态 *' : 'Payment Status *')}
                  </label>
                  <select
                    id="payment_status"
                    {...register('payment_status')}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="pending">{t('orders.pay.pending', locale === 'zh' ? '待支付' : 'Pending')}</option>
                    <option value="paid">{t('orders.pay.paid', locale === 'zh' ? '已支付' : 'Paid')}</option>
                    <option value="failed">{t('orders.pay.failed', locale === 'zh' ? '失败' : 'Failed')}</option>
                    <option value="refunded">{t('orders.pay.refunded', locale === 'zh' ? '已退款' : 'Refunded')}</option>
                  </select>
                  {errors.payment_status && (
                    <p className="mt-1 text-sm text-red-600">{errors.payment_status.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="shipping_carrier" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('orders.field.carrier', locale === 'zh' ? '承运商' : 'Shipping Carrier')}
                    </label>
                    <input
                      type="text"
                      id="shipping_carrier"
                      {...register('shipping_carrier')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('orders.field.carrierPh', locale === 'zh' ? '例如：DHL / FedEx / UPS...' : 'DHL / FedEx / UPS...')}
                    />
                  </div>
                  <div>
                    <label htmlFor="tracking_number" className="block text-sm font-medium text-gray-700 mb-1">
                      {t('orders.field.tracking', locale === 'zh' ? '运单号' : 'Tracking Number')}
                    </label>
                    <input
                      type="text"
                      id="tracking_number"
                      {...register('tracking_number')}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('orders.field.trackingPh', locale === 'zh' ? '物流单号' : 'Tracking number')}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" {...register('notify_shipped')} className="h-4 w-4" />
                  {t('orders.field.notifyShipped', locale === 'zh' ? '给客户发送发货通知邮件' : 'Email customer a shipping notification')}
                </label>
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.addresses', locale === 'zh' ? '地址信息' : 'Addresses')}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label htmlFor="shipping_address" className="block text-sm font-medium text-gray-700 mb-1">
                  {t('orders.shippingAddress', locale === 'zh' ? '收货地址 *' : 'Shipping Address *')}
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
                  {t('orders.billingAddress', locale === 'zh' ? '账单地址 *' : 'Billing Address *')}
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.notes', locale === 'zh' ? '订单备注' : 'Order Notes')}</h3>
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                {t('orders.field.notes', locale === 'zh' ? '备注' : 'Notes')}
              </label>
              <textarea
                id="notes"
                rows={4}
                {...register('notes')}
                placeholder={t('orders.field.notesPh', locale === 'zh' ? '添加该订单的备注信息...' : 'Add any additional notes about this order...')}
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
              {t('common.cancel', locale === 'zh' ? '取消' : 'Cancel')}
            </Link>
            <button
              type="submit"
              disabled={updateOrderMutation.isPending || !isDirty}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateOrderMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {t('common.updating', locale === 'zh' ? '更新中...' : 'Updating...')}
                </>
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  {t('orders.edit.save', locale === 'zh' ? '更新订单' : 'Update Order')}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
