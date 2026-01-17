'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { PhotoIcon } from '@heroicons/react/24/outline';

import MediaPickerModal from '@/components/admin/MediaPickerModal';
import type { HomepageContent } from '@/types';

type FormValues = {
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  button_text: string;
  button_url: string;
  sort_order: number;
  is_active: boolean;
};

function fromContent(content?: HomepageContent | null): FormValues {
  return {
    title: content?.title || '',
    subtitle: content?.subtitle || '',
    description: content?.description || '',
    image_url: content?.image_url || '',
    button_text: content?.button_text || '',
    button_url: content?.button_url || '',
    sort_order: Number((content as any)?.sort_order ?? 0),
    is_active: Boolean((content as any)?.is_active ?? false),
  };
}

export default function SimpleSectionEditor({
  content,
  onSave,
}: {
  content?: HomepageContent | null;
  onSave: (payload: { title: string; subtitle: string; description: string; image_url: string; button_text: string; button_url: string; sort_order: number; is_active: boolean }) => Promise<void>;
}) {
  const defaults = useMemo(() => fromContent(content), [content]);
  const { register, handleSubmit, reset, setValue, watch, formState } = useForm<FormValues>({ defaultValues: defaults });
  useEffect(() => reset(defaults), [defaults, reset]);

  const imageUrl = watch('image_url');
  const [pickerOpen, setPickerOpen] = useState(false);

  const onSubmit = async (values: FormValues) => {
    await onSave(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
          <input type="number" {...register('sort_order', { valueAsNumber: true })} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" {...register('is_active')} className="h-4 w-4 rounded border-gray-300" />
            Active
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
        <input {...register('title')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Subtitle</label>
        <input {...register('subtitle')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
        <textarea rows={6} {...register('description')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
        <div className="flex gap-2">
          <input {...register('image_url')} className="flex-1 px-3 py-2 border border-gray-300 rounded-md" placeholder="/uploads/..." />
          <button type="button" onClick={() => setPickerOpen(true)} className="px-3 py-2 rounded-md border border-gray-200 hover:bg-gray-50">
            <PhotoIcon className="h-5 w-5" />
          </button>
        </div>
        {imageUrl ? (
          <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="preview" className="w-full h-auto" />
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Button Text</label>
          <input {...register('button_text')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Button URL</label>
          <input {...register('button_url')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={() => reset(defaults)} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50" disabled={formState.isSubmitting}>
          Reset
        </button>
        <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={formState.isSubmitting}>
          Save
        </button>
      </div>

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        multiple={false}
        title="Select an image"
        onSelect={(assets) => {
          if (assets[0]) setValue('image_url', assets[0].url, { shouldDirty: true });
        }}
      />
    </form>
  );
}

