'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  Cog6ToothIcon,
  ShieldCheckIcon,
  BellIcon,
  GlobeAltIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { SettingsService } from '@/services';
import { queryKeys } from '@/lib/react-query';

interface SettingsForm {
  site_name: string;
  site_description: string;
  site_url: string;
  admin_email: string;
  support_email: string;
  timezone: string;
  currency: string;
  language: string;
  maintenance_mode: boolean;
  allow_registration: boolean;
  email_notifications: boolean;
  sms_notifications: boolean;
  google_analytics_id: string;
  facebook_pixel_id: string;
  smtp_host: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password: string;
  smtp_encryption: string;
}

export default function AdminSettingsPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const queryClient = useQueryClient();

  // Fetch settings
  const { data: settingsData, isLoading, error } = useQuery({
    queryKey: queryKeys.settings.all(),
    queryFn: () => SettingsService.getSettings(),
  });

  const settings = settingsData?.data;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<SettingsForm>({
    defaultValues: settings || {}
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: SettingsForm) => SettingsService.updateSettings(data),
    onSuccess: () => {
      toast.success('Settings updated successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all() });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update settings');
    },
  });

  const onSubmit = (data: SettingsForm) => {
    updateSettingsMutation.mutate(data);
  };

  const handleCancel = () => {
    reset(settings);
    setIsEditing(false);
  };

  const tabs = [
    { id: 'general', name: 'General', icon: Cog6ToothIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'integrations', name: 'Integrations', icon: GlobeAltIcon },
  ];

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Settings</h3>
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
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your application settings and configuration
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Edit Settings
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
                  disabled={updateSettingsMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateSettingsMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading settings...</p>
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8 px-6">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="h-4 w-4 mr-2" />
                      {tab.name}
                    </button>
                  );
                })}
              </nav>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="p-6">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="site_name" className="block text-sm font-medium text-gray-700">
                        Site Name *
                      </label>
                      <input
                        type="text"
                        id="site_name"
                        {...register('site_name', { required: 'Site name is required' })}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                      {errors.site_name && (
                        <p className="mt-1 text-sm text-red-600">{errors.site_name.message}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="site_url" className="block text-sm font-medium text-gray-700">
                        Site URL
                      </label>
                      <input
                        type="url"
                        id="site_url"
                        {...register('site_url')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="site_description" className="block text-sm font-medium text-gray-700">
                      Site Description
                    </label>
                    <textarea
                      id="site_description"
                      rows={3}
                      {...register('site_description')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="admin_email" className="block text-sm font-medium text-gray-700">
                        Admin Email
                      </label>
                      <input
                        type="email"
                        id="admin_email"
                        {...register('admin_email')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="support_email" className="block text-sm font-medium text-gray-700">
                        Support Email
                      </label>
                      <input
                        type="email"
                        id="support_email"
                        {...register('support_email')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                    <div>
                      <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                        Timezone
                      </label>
                      <select
                        id="timezone"
                        {...register('timezone')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">Eastern Time</option>
                        <option value="America/Chicago">Central Time</option>
                        <option value="America/Denver">Mountain Time</option>
                        <option value="America/Los_Angeles">Pacific Time</option>
                        <option value="Asia/Tokyo">Tokyo</option>
                        <option value="Europe/London">London</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                        Currency
                      </label>
                      <select
                        id="currency"
                        {...register('currency')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="CNY">CNY (¥)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                        Language
                      </label>
                      <select
                        id="language"
                        {...register('language')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                        <option value="ja">日本語</option>
                        <option value="ko">한국어</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Settings */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="maintenance_mode"
                        type="checkbox"
                        {...register('maintenance_mode')}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <label htmlFor="maintenance_mode" className="ml-2 block text-sm text-gray-900">
                        Maintenance Mode
                      </label>
                    </div>
                    <p className="text-sm text-gray-500">
                      When enabled, the site will show a maintenance page to visitors.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="allow_registration"
                        type="checkbox"
                        {...register('allow_registration')}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <label htmlFor="allow_registration" className="ml-2 block text-sm text-gray-900">
                        Allow User Registration
                      </label>
                    </div>
                    <p className="text-sm text-gray-500">
                      Allow new users to register accounts on the website.
                    </p>
                  </div>
                </div>
              )}

              {/* Notification Settings */}
              {activeTab === 'notifications' && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="email_notifications"
                        type="checkbox"
                        {...register('email_notifications')}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <label htmlFor="email_notifications" className="ml-2 block text-sm text-gray-900">
                        Email Notifications
                      </label>
                    </div>
                    <p className="text-sm text-gray-500">
                      Send email notifications for important events.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        id="sms_notifications"
                        type="checkbox"
                        {...register('sms_notifications')}
                        disabled={!isEditing}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                      />
                      <label htmlFor="sms_notifications" className="ml-2 block text-sm text-gray-900">
                        SMS Notifications
                      </label>
                    </div>
                    <p className="text-sm text-gray-500">
                      Send SMS notifications for urgent events.
                    </p>
                  </div>

                  {/* SMTP Settings */}
                  <div className="border-t border-gray-200 pt-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4">SMTP Configuration</h4>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label htmlFor="smtp_host" className="block text-sm font-medium text-gray-700">
                          SMTP Host
                        </label>
                        <input
                          type="text"
                          id="smtp_host"
                          {...register('smtp_host')}
                          disabled={!isEditing}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="smtp_port" className="block text-sm font-medium text-gray-700">
                          SMTP Port
                        </label>
                        <input
                          type="number"
                          id="smtp_port"
                          {...register('smtp_port')}
                          disabled={!isEditing}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="smtp_username" className="block text-sm font-medium text-gray-700">
                          SMTP Username
                        </label>
                        <input
                          type="text"
                          id="smtp_username"
                          {...register('smtp_username')}
                          disabled={!isEditing}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>

                      <div>
                        <label htmlFor="smtp_password" className="block text-sm font-medium text-gray-700">
                          SMTP Password
                        </label>
                        <input
                          type="password"
                          id="smtp_password"
                          {...register('smtp_password')}
                          disabled={!isEditing}
                          className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label htmlFor="smtp_encryption" className="block text-sm font-medium text-gray-700">
                        SMTP Encryption
                      </label>
                      <select
                        id="smtp_encryption"
                        {...register('smtp_encryption')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option value="">None</option>
                        <option value="tls">TLS</option>
                        <option value="ssl">SSL</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Integration Settings */}
              {activeTab === 'integrations' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="google_analytics_id" className="block text-sm font-medium text-gray-700">
                      Google Analytics ID
                    </label>
                    <input
                      type="text"
                      id="google_analytics_id"
                      {...register('google_analytics_id')}
                      disabled={!isEditing}
                      placeholder="G-XXXXXXXXXX"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="facebook_pixel_id" className="block text-sm font-medium text-gray-700">
                      Facebook Pixel ID
                    </label>
                    <input
                      type="text"
                      id="facebook_pixel_id"
                      {...register('facebook_pixel_id')}
                      disabled={!isEditing}
                      placeholder="123456789012345"
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              )}
            </form>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
