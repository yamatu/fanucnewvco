'use client';

import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { CheckoutFormData } from '@/app/checkout/page';
import {
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface CheckoutFormProps {
  register: UseFormRegister<CheckoutFormData>;
  errors: FieldErrors<CheckoutFormData>;
  onSubmit: () => void;
  isProcessing: boolean;
  sameAsShipping: boolean;
  setSameAsShipping: (value: boolean) => void;
	shippingRates?: Array<{ country_code: string; country_name: string }>;
}

export default function CheckoutForm({
  register,
  errors,
  onSubmit,
  isProcessing,
  sameAsShipping,
  setSameAsShipping,
	shippingRates = []
}: CheckoutFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-center mb-6">
        <UserIcon className="h-6 w-6 text-amber-600 mr-2" />
        <h2 className="text-xl font-semibold text-gray-900">Customer Information</h2>
      </div>

      {/* Customer Name */}
      <div>
        <label htmlFor="customer_name" className="block text-sm font-medium text-gray-700 mb-2">
          Full Name *
        </label>
        <div className="relative">
          <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            id="customer_name"
            {...register('customer_name')}
            className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
              errors.customer_name ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your full name"
          />
        </div>
        {errors.customer_name && (
          <p className="mt-1 text-sm text-red-600">{errors.customer_name.message}</p>
        )}
      </div>

      {/* Email */}
      <div>
        <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700 mb-2">
          Email Address *
        </label>
        <div className="relative">
          <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="email"
            id="customer_email"
            {...register('customer_email')}
            className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
              errors.customer_email ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your email address"
          />
        </div>
        {errors.customer_email && (
          <p className="mt-1 text-sm text-red-600">{errors.customer_email.message}</p>
        )}
      </div>

      {/* Phone */}
      <div>
        <label htmlFor="customer_phone" className="block text-sm font-medium text-gray-700 mb-2">
          Phone Number *
        </label>
        <div className="relative">
          <PhoneIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="tel"
            id="customer_phone"
            {...register('customer_phone')}
            className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
              errors.customer_phone ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your phone number"
          />
        </div>
        {errors.customer_phone && (
          <p className="mt-1 text-sm text-red-600">{errors.customer_phone.message}</p>
        )}
      </div>

      {/* Shipping Address */}
      <div>
        <label htmlFor="shipping_address" className="block text-sm font-medium text-gray-700 mb-2">
          Shipping Address *
        </label>
        <div className="relative">
          <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <textarea
            id="shipping_address"
            {...register('shipping_address')}
            rows={3}
            className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none ${
              errors.shipping_address ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Enter your complete shipping address"
          />
        </div>
        {errors.shipping_address && (
          <p className="mt-1 text-sm text-red-600">{errors.shipping_address.message}</p>
        )}
      </div>

	  {/* Shipping Country */}
	  <div>
		<label htmlFor="shipping_country" className="block text-sm font-medium text-gray-700 mb-2">
		  Shipping Country *
		</label>
		<select
		  id="shipping_country"
		  {...register('shipping_country')}
		  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 ${
			errors.shipping_country ? 'border-red-300' : 'border-gray-300'
		  }`}
		>
		  <option value="">Select country</option>
		  {shippingRates.map((r) => (
			<option key={r.country_code} value={r.country_code}>
			  {r.country_name} ({r.country_code})
			</option>
		  ))}
		</select>
		{errors.shipping_country && (
		  <p className="mt-1 text-sm text-red-600">{String(errors.shipping_country.message || 'Country is required')}</p>
		)}
	  </div>

      {/* Same as Shipping Checkbox */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="same_as_shipping"
          checked={sameAsShipping}
          onChange={(e) => setSameAsShipping(e.target.checked)}
          className="h-4 w-4 text-amber-600 focus:ring-amber-500 border-gray-300 rounded"
        />
        <label htmlFor="same_as_shipping" className="ml-2 text-sm text-gray-700">
          Billing address is the same as shipping address
        </label>
      </div>

      {/* Billing Address */}
      <div>
        <label htmlFor="billing_address" className="block text-sm font-medium text-gray-700 mb-2">
          Billing Address *
        </label>
        <div className="relative">
          <MapPinIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <textarea
            id="billing_address"
            {...register('billing_address')}
            rows={3}
            disabled={sameAsShipping}
            className={`w-full pl-10 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none ${
              errors.billing_address ? 'border-red-300' : 'border-gray-300'
            } ${sameAsShipping ? 'bg-gray-50 text-gray-500' : ''}`}
            placeholder={sameAsShipping ? 'Same as shipping address' : 'Enter your billing address'}
          />
        </div>
        {errors.billing_address && (
          <p className="mt-1 text-sm text-red-600">{errors.billing_address.message}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Order Notes (Optional)
        </label>
        <div className="relative">
          <DocumentTextIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
          <textarea
            id="notes"
            {...register('notes')}
            rows={3}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none"
            placeholder="Any special instructions or notes for your order"
          />
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isProcessing}
        className="w-full bg-amber-600 text-white py-3 px-4 rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 font-medium"
      >
        {isProcessing ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : (
          'Proceed to Payment'
        )}
      </button>

      <p className="text-xs text-gray-500 text-center">
        By proceeding, you agree to our Terms of Service and Privacy Policy
      </p>
    </form>
  );
}
