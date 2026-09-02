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
import { useAdminI18n } from '@/lib/admin-i18n';

export default function OrderDetailPage() {
  const { locale, t } = useAdminI18n();
  const params = useParams();
  const orderId = parseInt(params.id as string);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [refundConfirm, setRefundConfirm] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
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
      toast.success(t('orders.toast.statusUpdated', locale === 'zh' ? '订单状态已更新！' : 'Order status updated successfully!'));
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
    onError: (error: any) => {
      toast.error(error.message || t('orders.toast.statusUpdateFailed', locale === 'zh' ? '更新订单状态失败' : 'Failed to update order status'));
    },
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: () => OrderService.deleteOrder(orderId),
    onSuccess: () => {
      toast.success(t('orders.toast.deleted', locale === 'zh' ? '订单已删除！' : 'Order deleted successfully!'));
      window.location.href = '/admin/orders';
    },
    onError: (error: any) => {
      toast.error(error.message || t('orders.toast.deleteFailed', locale === 'zh' ? '删除订单失败' : 'Failed to delete order'));
    },
  });

  const refundOrderMutation = useMutation({
    mutationFn: () => {
      const amount = refundAmount.trim() === '' ? undefined : Number(refundAmount);
      if (amount !== undefined && (!Number.isFinite(amount) || amount <= 0)) {
        throw new Error(locale === 'zh' ? '请输入有效的退款金额' : 'Enter a valid refund amount');
      }
      return OrderService.refundOrder(orderId, { amount, reason: refundReason.trim() || undefined });
    },
    onSuccess: (result) => {
      toast.success(result.refund.status === 'pending'
        ? (locale === 'zh' ? '退款已提交，PayPal 正在处理' : 'Refund submitted and is pending at PayPal')
        : (locale === 'zh' ? '退款已完成' : 'Refund completed'));
      setRefundConfirm(false);
      setRefundAmount('');
      setRefundReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.lists() });
    },
    onError: (error: any) => {
      toast.error(error.message || (locale === 'zh' ? '退款失败' : 'Refund failed'));
    },
  });

  const syncRefundMutation = useMutation({
    mutationFn: (refundId: number) => OrderService.syncRefund(orderId, refundId),
    onSuccess: (result) => {
      toast.success(result.refund.status === 'completed'
        ? (locale === 'zh' ? '退款状态已更新为完成' : 'Refund is now completed')
        : (locale === 'zh' ? '退款仍在 PayPal 处理中' : 'Refund is still pending at PayPal'));
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.detail(orderId) });
    },
    onError: (error: any) => toast.error(error.message || (locale === 'zh' ? '同步退款状态失败' : 'Failed to sync refund status')),
  });

  const handleStatusUpdate = (newStatus: string) => {
    updateOrderStatusMutation.mutate(newStatus);
  };

  const handleDeleteOrder = () => {
    deleteOrderMutation.mutate();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: t('orders.status.pending', locale === 'zh' ? '待处理' : 'Pending'), color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      confirmed: { label: t('orders.status.confirmed', locale === 'zh' ? '已确认' : 'Confirmed'), color: 'bg-blue-100 text-blue-800', icon: CheckCircleIcon },
      processing: { label: t('orders.status.processing', locale === 'zh' ? '处理中' : 'Processing'), color: 'bg-purple-100 text-purple-800', icon: ClockIcon },
      shipped: { label: t('orders.status.shipped', locale === 'zh' ? '已发货' : 'Shipped'), color: 'bg-indigo-100 text-indigo-800', icon: TruckIcon },
      delivered: { label: t('orders.status.delivered', locale === 'zh' ? '已送达' : 'Delivered'), color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      cancelled: { label: t('orders.status.cancelled', locale === 'zh' ? '已取消' : 'Cancelled'), color: 'bg-red-100 text-red-800', icon: XCircleIcon },
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
      pending: { label: t('orders.pay.pending', locale === 'zh' ? '待支付' : 'Pending'), color: 'bg-yellow-100 text-yellow-800' },
      paid: { label: t('orders.pay.paid', locale === 'zh' ? '已支付' : 'Paid'), color: 'bg-green-100 text-green-800' },
      failed: { label: t('orders.pay.failed', locale === 'zh' ? '失败' : 'Failed'), color: 'bg-red-100 text-red-800' },
      refund_pending: { label: locale === 'zh' ? '退款处理中' : 'Refund pending', color: 'bg-yellow-100 text-yellow-800' },
      partially_refunded: { label: locale === 'zh' ? '部分退款' : 'Partially refunded', color: 'bg-orange-100 text-orange-800' },
      refunded: { label: t('orders.pay.refunded', locale === 'zh' ? '已退款' : 'Refunded'), color: 'bg-gray-100 text-gray-800' },
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/admin/orders"
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {t('orders.back', locale === 'zh' ? '返回订单列表' : 'Back to Orders')}
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('orders.detail.title', locale === 'zh' ? '订单 #{orderNumber}' : 'Order #{orderNumber}', { orderNumber: order.order_number })}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {t('orders.detail.subtitle', locale === 'zh' ? '订单详情与管理' : 'Order details and management')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {OrderService.canEditOrder(order) && (
              <Link
                href={`/admin/orders/${order.id}/edit`}
                className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <PencilIcon className="h-4 w-4 mr-2" />
                {t('orders.edit.action', locale === 'zh' ? '编辑订单' : 'Edit Order')}
              </Link>
            )}
            {OrderService.canDeleteOrder(order) && (
              <button
                onClick={() => setDeleteConfirm(true)}
                className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100"
              >
                <TrashIcon className="h-4 w-4 mr-2" />
                {t('orders.delete.confirmBtn', locale === 'zh' ? '删除订单' : 'Delete Order')}
              </button>
            )}
            {OrderService.canRefundOrder(order) && (
              <button
                type="button"
                onClick={() => {
                  setRefundAmount(OrderService.refundableAmount(order).toFixed(2));
                  setRefundConfirm(true);
                }}
                className="inline-flex items-center px-4 py-2 border border-orange-300 rounded-md text-sm font-medium text-orange-700 bg-orange-50 hover:bg-orange-100"
              >
                <CurrencyDollarIcon className="h-4 w-4 mr-2" />
                {locale === 'zh' ? '退款' : 'Refund'}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Order Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Status */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.detail.statusBlock', locale === 'zh' ? '订单状态' : 'Order Status')}</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('orders.status.title', locale === 'zh' ? '状态' : 'Order Status')}
                  </label>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(order.status)}
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusUpdate(e.target.value)}
                      disabled={updateOrderStatusMutation.isPending}
                      className="text-sm border border-gray-300 rounded px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pending">{t('orders.status.pending', locale === 'zh' ? '待处理' : 'Pending')}</option>
                      <option value="confirmed">{t('orders.status.confirmed', locale === 'zh' ? '已确认' : 'Confirmed')}</option>
                      <option value="processing">{t('orders.status.processing', locale === 'zh' ? '处理中' : 'Processing')}</option>
                      <option value="shipped">{t('orders.status.shipped', locale === 'zh' ? '已发货' : 'Shipped')}</option>
                      <option value="delivered">{t('orders.status.delivered', locale === 'zh' ? '已送达' : 'Delivered')}</option>
                      <option value="cancelled">{t('orders.status.cancelled', locale === 'zh' ? '已取消' : 'Cancelled')}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('orders.pay.title', locale === 'zh' ? '支付状态' : 'Payment Status')}
                  </label>
                  <div>
                    {getPaymentStatusBadge(order.payment_status || 'pending')}
                  </div>
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.items.title', locale === 'zh' ? '订单商品' : 'Order Items')}</h3>
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">
                        {item.product?.name || t('orders.items.productId', locale === 'zh' ? '产品ID：{id}' : 'Product ID: {id}', { id: item.product_id })}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {t('products.field.skuLabel', locale === 'zh' ? 'SKU：' : 'SKU:')} {item.product?.sku || t('common.na', locale === 'zh' ? '无' : 'N/A')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {item.quantity} × {formatCurrency(item.unit_price)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {t('common.total', locale === 'zh' ? '小计：' : 'Total:')} {formatCurrency(item.total_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t flex justify-between items-center">
                <span className="font-medium text-gray-900">{t('orders.total', locale === 'zh' ? '订单总计：' : 'Order Total:')}</span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(order.total_amount)}
                </span>
              </div>
              {(Number(order.refunded_amount || 0) > 0 || (order.refunds?.length || 0) > 0) && (
                <div className="mt-4 pt-4 border-t text-sm space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>{locale === 'zh' ? '已退款' : 'Refunded'}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(Number(order.refunded_amount || 0))}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>{locale === 'zh' ? '可退款余额' : 'Refundable balance'}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(OrderService.refundableAmount(order))}</span>
                  </div>
                </div>
              )}
            </div>

            {order.refunds && order.refunds.length > 0 && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{locale === 'zh' ? '退款记录' : 'Refund history'}</h3>
                <div className="space-y-3">
                  {order.refunds.map((refund) => (
                    <div key={refund.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div>
                        <div className="font-medium text-gray-900">{formatCurrency(refund.amount, refund.currency)}</div>
                        <div className="text-xs text-gray-500">{refund.reason || (locale === 'zh' ? '无备注' : 'No reason')}</div>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div className="font-medium capitalize">{refund.status}</div>
                        <div>{new Date(refund.created_at).toLocaleString()}</div>
                        {refund.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => syncRefundMutation.mutate(refund.id)}
                            disabled={syncRefundMutation.isPending}
                            className="mt-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >{locale === 'zh' ? '同步状态' : 'Sync status'}</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            {order.notes && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.notes', locale === 'zh' ? '订单备注' : 'Order Notes')}</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-6">
            {/* Customer Details */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.customer', locale === 'zh' ? '客户信息' : 'Customer Information')}</h3>
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
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.addresses', locale === 'zh' ? '地址信息' : 'Addresses')}</h3>
              <div className="space-y-4">
                {(order as any).tracking_number || (order as any).shipping_carrier ? (
                  <div>
                    <h4 className="flex items-center font-medium text-gray-900 mb-2">
                      <TruckIcon className="h-4 w-4 mr-2" />
                      {t('orders.tracking', locale === 'zh' ? '物流信息' : 'Shipping Tracking')}
                    </h4>
                    <div className="text-sm text-gray-700 space-y-1">
                      {(order as any).shipping_carrier ? (
                        <div>
                          <span className="text-gray-500">{t('orders.tracking.carrier', locale === 'zh' ? '承运商：' : 'Carrier:')}</span> {(order as any).shipping_carrier}
                        </div>
                      ) : null}
                      {(order as any).tracking_number ? (
                        <div>
                          <span className="text-gray-500">{t('orders.tracking.number', locale === 'zh' ? '运单号：' : 'Tracking #:')}</span>{' '}
                          <span className="font-mono">{(order as any).tracking_number}</span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div>
                  <h4 className="flex items-center font-medium text-gray-900 mb-2">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {t('orders.shippingAddress', locale === 'zh' ? '收货地址' : 'Shipping Address')}
                  </h4>
                  <p className="text-gray-700 text-sm whitespace-pre-line">
                    {order.shipping_address}
                  </p>
                </div>
                <div>
                  <h4 className="flex items-center font-medium text-gray-900 mb-2">
                    <MapPinIcon className="h-4 w-4 mr-2" />
                    {t('orders.billingAddress', locale === 'zh' ? '账单地址' : 'Billing Address')}
                  </h4>
                  <p className="text-gray-700 text-sm whitespace-pre-line">
                    {order.billing_address}
                  </p>
                </div>
              </div>
            </div>

            {/* Order Timeline */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('orders.timeline', locale === 'zh' ? '订单时间线' : 'Order Timeline')}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('orders.createdAt', locale === 'zh' ? '创建时间：' : 'Order Created:')}</span>
                  <span className="font-medium">
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{t('orders.updatedAt', locale === 'zh' ? '更新时间：' : 'Last Updated:')}</span>
                  <span className="font-medium">
                    {new Date(order.updated_at).toLocaleDateString()} {new Date(order.updated_at).toLocaleTimeString()}
                  </span>
                </div>
                {order.payment_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('orders.paymentId', locale === 'zh' ? '支付ID：' : 'Payment ID:')}</span>
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
                <h3 className="text-lg font-medium text-gray-900">{t('orders.delete.title', locale === 'zh' ? '删除订单' : 'Delete Order')}</h3>
              </div>
              <p className="text-gray-500 mb-6">
                {t(
                  'orders.delete.confirmDetail',
                  locale === 'zh'
                    ? '确定要删除订单 #{orderNumber} 吗？此操作不可撤销。'
                    : 'Are you sure you want to delete order #{orderNumber}? This action cannot be undone.',
                  { orderNumber: order.order_number }
                )}
                {order.payment_status === 'paid' && (
                  <span className="block mt-2 text-orange-600 font-medium">
                    {t('orders.delete.paidNote', locale === 'zh' ? '注意：该订单已支付，删除后会恢复产品库存。' : 'Note: This order has been paid. Product stock will be restored.')}
                  </span>
                )}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setDeleteConfirm(false)}
                  disabled={deleteOrderMutation.isPending}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('common.cancel', locale === 'zh' ? '取消' : 'Cancel')}
                </button>
                <button
                  onClick={handleDeleteOrder}
                  disabled={deleteOrderMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 disabled:opacity-50 flex items-center"
                >
                  {deleteOrderMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      {t('common.deleting', locale === 'zh' ? '删除中...' : 'Deleting...')}
                    </>
                  ) : (
                    t('orders.delete.confirmBtn', locale === 'zh' ? '确认删除' : 'Delete Order')
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {refundConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center mb-4">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-medium text-gray-900">{locale === 'zh' ? '确认 PayPal 退款' : 'Confirm PayPal refund'}</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                {locale === 'zh' ? '此操作会向 PayPal 发起真实退款，不能撤销。' : 'This starts a real PayPal refund and cannot be undone.'}
              </p>
              <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'zh' ? '退款金额' : 'Refund amount'} ({order.currency})</label>
              <input
                type="number"
                min="0.01"
                max={OrderService.refundableAmount(order)}
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 mb-3"
              />
              <label className="block text-sm font-medium text-gray-700 mb-1">{locale === 'zh' ? '退款原因（可选）' : 'Reason (optional)'}</label>
              <textarea
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                maxLength={500}
                rows={3}
                className="block w-full rounded-md border border-gray-300 px-3 py-2 mb-5"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setRefundConfirm(false)}
                  disabled={refundOrderMutation.isPending}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                >{t('common.cancel', locale === 'zh' ? '取消' : 'Cancel')}</button>
                <button
                  type="button"
                  onClick={() => refundOrderMutation.mutate()}
                  disabled={refundOrderMutation.isPending}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md text-sm hover:bg-orange-700 disabled:opacity-50"
                >{refundOrderMutation.isPending ? (locale === 'zh' ? '提交中...' : 'Submitting...') : (locale === 'zh' ? '确认退款' : 'Confirm refund')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
