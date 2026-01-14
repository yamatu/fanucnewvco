'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import { CouponService, CouponCreateRequest } from '@/services/coupon.service';
import {
  TagIcon,
  ArrowLeftIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

// Validation schema
const couponSchema = yup.object({
  code: yup.string().required('Coupon code is required').min(3, 'Code must be at least 3 characters'),
  name: yup.string().required('Coupon name is required'),
  description: yup.string(),
  type: yup.string().oneOf(['percentage', 'fixed_amount']).required('Discount type is required'),
  value: yup.number().required('Discount value is required').min(0.01, 'Value must be greater than 0'),
  min_order_amount: yup.number().min(0, 'Minimum order amount cannot be negative').default(0),
  max_discount_amount: yup.number().min(0, 'Maximum discount amount cannot be negative').nullable(),
  usage_limit: yup.number().min(1, 'Usage limit must be at least 1').nullable(),
  user_usage_limit: yup.number().min(1, 'User usage limit must be at least 1').nullable(),
  is_active: yup.boolean().default(true),
  starts_at: yup.string().nullable(),
  expires_at: yup.string().nullable()
});

type CouponFormData = yup.InferType<typeof couponSchema>;

export default function NewCouponPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm<CouponFormData>({
    resolver: yupResolver(couponSchema),
    defaultValues: {
      type: 'percentage',
      min_order_amount: 0,
      is_active: true
    }
  });

  const watchType = watch('type');
  const watchValue = watch('value');

  const onSubmit = async (data: CouponFormData) => {
    setIsSubmitting(true);

    try {
      // Validate percentage value
      if (data.type === 'percentage' && data.value > 100) {
        toast.error('Percentage discount cannot exceed 100%');
        return;
      }

      // Format dates
      const formattedData: CouponCreateRequest = {
        ...data,
        code: data.code.toUpperCase(),
        starts_at: data.starts_at || undefined,
        expires_at: data.expires_at || undefined
      };

      await CouponService.createCoupon(formattedData);
      toast.success('Coupon created successfully');
      router.push('/admin/coupons');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create coupon');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRandomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    setValue('code', result);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/admin/coupons"
              className="text-gray-400 hover:text-gray-600"
            >
              <ArrowLeftIcon className="h-6 w-6" />
            </Link>
            <TagIcon className="h-8 w-8 text-amber-600" />
            <h1 className="text-2xl font-bold text-gray-900">Create New Coupon</h1>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow-sm rounded-lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-6">
            {/* Basic Information */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Coupon Code */}
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Code *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="code"
                      {...register('code')}
                      className={`flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                        errors.code ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Enter coupon code"
                      style={{ textTransform: 'uppercase' }}
                    />
                    <button
                      type="button"
                      onClick={generateRandomCode}
                      className="px-3 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      Generate
                    </button>
                  </div>
                  {errors.code && (
                    <p className="mt-1 text-sm text-red-600">{errors.code.message}</p>
                  )}
                </div>

                {/* Coupon Name */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Coupon Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    {...register('name')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                      errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter coupon name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    {...register('description')}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                    placeholder="Enter coupon description"
                  />
                </div>
              </div>
            </div>

            {/* Discount Settings */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Discount Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Discount Type */}
                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Type *
                  </label>
                  <select
                    id="type"
                    {...register('type')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="percentage">Percentage Discount</option>
                    <option value="fixed_amount">Fixed Amount Discount</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div>
                  <label htmlFor="value" className="block text-sm font-medium text-gray-700 mb-2">
                    Discount Value *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="value"
                      {...register('value')}
                      step={watchType === 'percentage' ? '0.01' : '0.01'}
                      min="0"
                      max={watchType === 'percentage' ? '100' : undefined}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                        errors.value ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder={watchType === 'percentage' ? '0-100' : '0.00'}
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <span className="text-gray-500 text-sm">
                        {watchType === 'percentage' ? '%' : '$'}
                      </span>
                    </div>
                  </div>
                  {errors.value && (
                    <p className="mt-1 text-sm text-red-600">{errors.value.message}</p>
                  )}
                  {watchType === 'percentage' && watchValue > 100 && (
                    <p className="mt-1 text-sm text-red-600">Percentage cannot exceed 100%</p>
                  )}
                </div>

                {/* Minimum Order Amount */}
                <div>
                  <label htmlFor="min_order_amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Order Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="min_order_amount"
                      {...register('min_order_amount')}
                      step="0.01"
                      min="0"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                        errors.min_order_amount ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0.00"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <span className="text-gray-500 text-sm">$</span>
                    </div>
                  </div>
                  {errors.min_order_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.min_order_amount.message}</p>
                  )}
                </div>

                {/* Maximum Discount Amount (for percentage coupons) */}
                {watchType === 'percentage' && (
                  <div>
                    <label htmlFor="max_discount_amount" className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Discount Amount
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        id="max_discount_amount"
                        {...register('max_discount_amount')}
                        step="0.01"
                        min="0"
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                          errors.max_discount_amount ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="No limit"
                      />
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        <span className="text-gray-500 text-sm">$</span>
                      </div>
                    </div>
                    {errors.max_discount_amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.max_discount_amount.message}</p>
                    )}
                    <p className="mt-1 text-sm text-gray-500">
                      Leave empty for no limit
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Usage Limits */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Usage Limit */}
                <div>
                  <label htmlFor="usage_limit" className="block text-sm font-medium text-gray-700 mb-2">
                    Total Usage Limit
                  </label>
                  <input
                    type="number"
                    id="usage_limit"
                    {...register('usage_limit')}
                    min="1"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                      errors.usage_limit ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Unlimited"
                  />
                  {errors.usage_limit && (
                    <p className="mt-1 text-sm text-red-600">{errors.usage_limit.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    Leave empty for unlimited usage
                  </p>
                </div>

                {/* Per User Usage Limit */}
                <div>
                  <label htmlFor="user_usage_limit" className="block text-sm font-medium text-gray-700 mb-2">
                    Per User Usage Limit
                  </label>
                  <input
                    type="number"
                    id="user_usage_limit"
                    {...register('user_usage_limit')}
                    min="1"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
                      errors.user_usage_limit ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Unlimited"
                  />
                  {errors.user_usage_limit && (
                    <p className="mt-1 text-sm text-red-600">{errors.user_usage_limit.message}</p>
                  )}
                  <p className="mt-1 text-sm text-gray-500">
                    How many times each user can use this coupon
                  </p>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Date Range</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Start Date */}
                <div>
                  <label htmlFor="starts_at" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    id="starts_at"
                    {...register('starts_at')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Leave empty to start immediately
                  </p>
                </div>

                {/* End Date */}
                <div>
                  <label htmlFor="expires_at" className="block text-sm font-medium text-gray-700 mb-2">
                    Expiry Date
                  </label>
                  <input
                    type="datetime-local"
                    id="expires_at"
                    {...register('expires_at')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Leave empty for no expiry
                  </p>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Status</h3>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  {...register('is_active')}
                  className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Inactive coupons cannot be used by customers
              </p>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    Coupon Guidelines
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Coupon codes are case-insensitive and will be stored in uppercase</li>
                      <li>Percentage discounts should be between 0-100</li>
                      <li>Fixed amount discounts cannot exceed the order total</li>
                      <li>Usage limits help prevent abuse of discount codes</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex items-center justify-end space-x-4 pt-6">
              <Link
                href="/admin/coupons"
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 text-white rounded-md text-sm font-medium hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creating...
                  </div>
                ) : (
                  'Create Coupon'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}