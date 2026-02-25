'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { MagnifyingGlassIcon, TruckIcon } from '@heroicons/react/24/outline';

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = orderNumber.trim();
    if (!trimmed) {
      setError('Please enter your order number');
      return;
    }
    setError('');
    router.push(`/orders/track/${encodeURIComponent(trimmed)}`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full mx-auto mb-6">
              <TruckIcon className="h-8 w-8 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Order</h1>
            <p className="text-gray-600 mb-6">
              Enter the order number from your confirmation email to check the status of your order.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={orderNumber}
                  onChange={(e) => { setOrderNumber(e.target.value); setError(''); }}
                  placeholder="e.g., ORD-20250225-XXXXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-md text-center text-lg focus:ring-yellow-500 focus:border-yellow-500"
                  autoFocus
                />
                {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-yellow-500 text-black font-semibold rounded-md hover:bg-yellow-600 transition-colors"
              >
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Track Order
              </button>
            </form>

            <p className="mt-6 text-xs text-gray-500">
              You can find your order number in the confirmation email sent after your purchase.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
