'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  GlobeAltIcon,
  PhotoIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { CompanyService } from '@/services';
import { queryKeys } from '@/lib/react-query';

interface CompanyProfileForm {
  name: string;
  description: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  founded_year: number;
  employee_count: string;
  business_hours: string;
  social_media: {
    facebook?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
}

export default function AdminCompanyPage() {
  const [isEditing, setIsEditing] = useState(false);
  const queryClient = useQueryClient();

  // Fetch company profile
  const { data: companyData, isLoading, error } = useQuery({
    queryKey: queryKeys.company.profile(),
    queryFn: () => CompanyService.getProfile(),
  });

  const company = companyData?.data;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CompanyProfileForm>({
    defaultValues: company || {}
  });

  // Update company profile mutation
  const updateCompanyMutation = useMutation({
    mutationFn: (data: CompanyProfileForm) => CompanyService.updateProfile(data),
    onSuccess: () => {
      toast.success('Company profile updated successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.company.profile() });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update company profile');
    },
  });

  const onSubmit = (data: CompanyProfileForm) => {
    updateCompanyMutation.mutate(data);
  };

  const handleCancel = () => {
    reset(company);
    setIsEditing(false);
  };

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Company Profile</h3>
          <p className="text-gray-500">{error.message}</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your company information and contact details
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Edit Profile
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit(onSubmit)}
                  disabled={updateCompanyMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateCompanyMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading company profile...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      {...register('name', { required: 'Company name is required' })}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="founded_year" className="block text-sm font-medium text-gray-700">
                      Founded Year
                    </label>
                    <input
                      type="number"
                      id="founded_year"
                      {...register('founded_year')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    rows={4}
                    {...register('description')}
                    disabled={!isEditing}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div>
                  <label htmlFor="logo_url" className="block text-sm font-medium text-gray-700">
                    Logo URL
                  </label>
                  <input
                    type="url"
                    id="logo_url"
                    {...register('logo_url')}
                    disabled={!isEditing}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <PhoneIcon className="h-5 w-5 mr-2" />
                  Contact Information
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      {...register('phone')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      {...register('email')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                    Website
                  </label>
                  <input
                    type="url"
                    id="website"
                    {...register('website')}
                    disabled={!isEditing}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  Address Information
                </h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                    Street Address
                  </label>
                  <input
                    type="text"
                    id="address"
                    {...register('address')}
                    disabled={!isEditing}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                  />
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                      City
                    </label>
                    <input
                      type="text"
                      id="city"
                      {...register('city')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                      State/Province
                    </label>
                    <input
                      type="text"
                      id="state"
                      {...register('state')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      id="postal_code"
                      {...register('postal_code')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                      Country
                    </label>
                    <input
                      type="text"
                      id="country"
                      {...register('country')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label htmlFor="employee_count" className="block text-sm font-medium text-gray-700">
                      Employee Count
                    </label>
                    <select
                      id="employee_count"
                      {...register('employee_count')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option value="">Select range</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="business_hours" className="block text-sm font-medium text-gray-700">
                      Business Hours
                    </label>
                    <input
                      type="text"
                      id="business_hours"
                      {...register('business_hours')}
                      disabled={!isEditing}
                      placeholder="e.g., Mon-Fri 9:00 AM - 5:00 PM"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
