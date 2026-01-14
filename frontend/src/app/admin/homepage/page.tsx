'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import {
  DocumentTextIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import AdminLayout from '@/components/admin/AdminLayout';
import { HomepageService } from '@/services';
import { queryKeys } from '@/lib/react-query';

interface HomepageContentForm {
  hero_title: string;
  hero_subtitle: string;
  hero_description: string;
  hero_image_url: string;
  hero_button_text: string;
  hero_button_url: string;
  about_title: string;
  about_description: string;
  about_image_url: string;
  features: Array<{
    id?: number;
    title: string;
    description: string;
    icon: string;
    order: number;
  }>;

  stats: Array<{
    id?: number;
    label: string;
    value: string;
    description: string;
    order: number;
  }>;
}

export default function AdminHomepagePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const queryClient = useQueryClient();

  // Fetch homepage content for Admin editor (aggregated)
  const { data: homepageData, isLoading, error } = useQuery({
    queryKey: queryKeys.homepage.adminContents(),
    queryFn: () => HomepageService.getContent(),
  });

  const content = homepageData?.data;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<HomepageContentForm>({
    defaultValues: content || {
      features: [],
      stats: []
    }
  });

  const watchedFeatures = watch('features') || [];
  const watchedStats = watch('stats') || [];

  // Update homepage content mutation
  const updateContentMutation = useMutation({
    mutationFn: (data: HomepageContentForm) => HomepageService.updateContent(data),
    onSuccess: () => {
      toast.success('Homepage content updated successfully!');
      queryClient.invalidateQueries({ queryKey: queryKeys.homepage.adminContents() });
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update homepage content');
    },
  });

  const onSubmit = (data: HomepageContentForm) => {
    updateContentMutation.mutate(data);
  };

  const handleCancel = () => {
    reset(content);
    setIsEditing(false);
  };

  const addFeature = () => {
    const newFeature = {
      title: '',
      description: '',
      icon: '',
      order: watchedFeatures.length
    };
    setValue('features', [...watchedFeatures, newFeature]);
  };

  const removeFeature = (index: number) => {
    const updatedFeatures = watchedFeatures.filter((_, i) => i !== index);
    setValue('features', updatedFeatures);
  };



  const addStat = () => {
    const newStat = {
      label: '',
      value: '',
      description: '',
      order: watchedStats.length
    };
    setValue('stats', [...watchedStats, newStat]);
  };

  const removeStat = (index: number) => {
    const updatedStats = watchedStats.filter((_, i) => i !== index);
    setValue('stats', updatedStats);
  };

  const tabs = [
    { id: 'hero', name: 'Hero Section', icon: PhotoIcon },
    { id: 'about', name: 'About Section', icon: DocumentTextIcon },
    { id: 'features', name: 'Features', icon: DocumentTextIcon },
    { id: 'stats', name: 'Statistics', icon: DocumentTextIcon },
  ];

  if (error) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <XCircleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Homepage Content</h3>
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
            <h1 className="text-2xl font-bold text-gray-900">Homepage Content</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your homepage content and sections
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                Edit Content
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
                  disabled={updateContentMutation.isPending}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {updateContentMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading homepage content...</p>
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
              {/* Hero Section */}
              {activeTab === 'hero' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="hero_title" className="block text-sm font-medium text-gray-700">
                      Hero Title *
                    </label>
                    <input
                      type="text"
                      id="hero_title"
                      {...register('hero_title', { required: 'Hero title is required' })}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                    {errors.hero_title && (
                      <p className="mt-1 text-sm text-red-600">{errors.hero_title.message}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="hero_subtitle" className="block text-sm font-medium text-gray-700">
                      Hero Subtitle
                    </label>
                    <input
                      type="text"
                      id="hero_subtitle"
                      {...register('hero_subtitle')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="hero_description" className="block text-sm font-medium text-gray-700">
                      Hero Description
                    </label>
                    <textarea
                      id="hero_description"
                      rows={4}
                      {...register('hero_description')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="hero_image_url" className="block text-sm font-medium text-gray-700">
                      Hero Image URL
                    </label>
                    <input
                      type="url"
                      id="hero_image_url"
                      {...register('hero_image_url')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <label htmlFor="hero_button_text" className="block text-sm font-medium text-gray-700">
                        Button Text
                      </label>
                      <input
                        type="text"
                        id="hero_button_text"
                        {...register('hero_button_text')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>

                    <div>
                      <label htmlFor="hero_button_url" className="block text-sm font-medium text-gray-700">
                        Button URL
                      </label>
                      <input
                        type="url"
                        id="hero_button_url"
                        {...register('hero_button_url')}
                        disabled={!isEditing}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* About Section */}
              {activeTab === 'about' && (
                <div className="space-y-6">
                  <div>
                    <label htmlFor="about_title" className="block text-sm font-medium text-gray-700">
                      About Title
                    </label>
                    <input
                      type="text"
                      id="about_title"
                      {...register('about_title')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="about_description" className="block text-sm font-medium text-gray-700">
                      About Description
                    </label>
                    <textarea
                      id="about_description"
                      rows={6}
                      {...register('about_description')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="about_image_url" className="block text-sm font-medium text-gray-700">
                      About Image URL
                    </label>
                    <input
                      type="url"
                      id="about_image_url"
                      {...register('about_image_url')}
                      disabled={!isEditing}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                    />
                  </div>
                </div>
              )}

              {/* Features Section */}
              {activeTab === 'features' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Features</h3>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={addFeature}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Feature
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {watchedFeatures.map((feature, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-900">Feature {index + 1}</h4>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => removeFeature(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Title
                            </label>
                            <input
                              type="text"
                              {...register(`features.${index}.title`)}
                              disabled={!isEditing}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Icon
                            </label>
                            <input
                              type="text"
                              {...register(`features.${index}.icon`)}
                              disabled={!isEditing}
                              placeholder="e.g., cog, shield, lightning"
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                          </div>
                        </div>

                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <textarea
                            rows={3}
                            {...register(`features.${index}.description`)}
                            disabled={!isEditing}
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistics Section */}
              {activeTab === 'stats' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-gray-900">Statistics</h3>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={addStat}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Add Statistic
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {watchedStats.map((stat, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-sm font-medium text-gray-900">Statistic {index + 1}</h4>
                          {isEditing && (
                            <button
                              type="button"
                              onClick={() => removeStat(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Label
                            </label>
                            <input
                              type="text"
                              {...register(`stats.${index}.label`)}
                              disabled={!isEditing}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Value
                            </label>
                            <input
                              type="text"
                              {...register(`stats.${index}.value`)}
                              disabled={!isEditing}
                              placeholder="e.g., 1000+, 99%"
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <input
                              type="text"
                              {...register(`stats.${index}.description`)}
                              disabled={!isEditing}
                              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
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
