'use client';

import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { Bars3Icon, PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

import type { HomepageContent } from '@/types';
import { SortableList } from '@/components/admin/homepage/SortableList';
import { IconPreview } from '@/components/admin/homepage/icon-options';
import { DEFAULT_SERVICES_SECTION_DATA } from '@/lib/homepage-defaults';
import { newId } from '@/components/admin/homepage/homepage-schema';

type ServiceForm = {
  id: string;
  icon: string;
  title: string;
  description: string;
  color: string;
  href: string;
  featuresText: string; // 1 per line
};

type StepForm = { id: string; step: string; title: string; description: string };
type BadgeForm = { id: string; text: string };

type FormValues = {
  headerTitle: string;
  headerDescription: string;
  services: ServiceForm[];
  processTitle: string;
  processDescription: string;
  processSteps: StepForm[];
  ctaTitle: string;
  ctaDescription: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  badges: BadgeForm[];
  is_active: boolean;
  sort_order: number;
};

function parseData(content?: HomepageContent | null): any {
  const raw = (content as any)?.data;
  return typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;
}

function fromContent(content?: HomepageContent | null): FormValues {
  const parsed = parseData(content);
  const base = parsed && (Array.isArray(parsed.services) || Array.isArray(parsed.processSteps)) ? parsed : DEFAULT_SERVICES_SECTION_DATA;

  const services = (base.services || DEFAULT_SERVICES_SECTION_DATA.services).map((s: any) => ({
    id: newId('service'),
    icon: String(s.icon || 'cog'),
    title: String(s.title || ''),
    description: String(s.description || ''),
    color: String(s.color || 'bg-yellow-500'),
    href: String(s.href || '/contact'),
    featuresText: Array.isArray(s.features) ? s.features.join('\n') : '',
  }));

  const processSteps = (base.processSteps || DEFAULT_SERVICES_SECTION_DATA.processSteps).map((s: any) => ({
    id: newId('step'),
    step: String(s.step || ''),
    title: String(s.title || ''),
    description: String(s.description || ''),
  }));

  const badges = ((base.ctaBadges || DEFAULT_SERVICES_SECTION_DATA.ctaBadges) as any[]).map((t: any) => ({
    id: newId('badge'),
    text: String(t || ''),
  }));

  return {
    headerTitle: String(base.headerTitle || content?.title || DEFAULT_SERVICES_SECTION_DATA.headerTitle),
    headerDescription: String(base.headerDescription || content?.description || DEFAULT_SERVICES_SECTION_DATA.headerDescription),
    services,
    processTitle: String(base.processTitle || DEFAULT_SERVICES_SECTION_DATA.processTitle),
    processDescription: String(base.processDescription || DEFAULT_SERVICES_SECTION_DATA.processDescription),
    processSteps,
    ctaTitle: String(base.ctaTitle || DEFAULT_SERVICES_SECTION_DATA.ctaTitle),
    ctaDescription: String(base.ctaDescription || DEFAULT_SERVICES_SECTION_DATA.ctaDescription),
    primaryCtaText: String(base.ctaPrimary?.text || DEFAULT_SERVICES_SECTION_DATA.ctaPrimary.text),
    primaryCtaHref: String(base.ctaPrimary?.href || DEFAULT_SERVICES_SECTION_DATA.ctaPrimary.href),
    secondaryCtaText: String(base.ctaSecondary?.text || DEFAULT_SERVICES_SECTION_DATA.ctaSecondary.text),
    secondaryCtaHref: String(base.ctaSecondary?.href || DEFAULT_SERVICES_SECTION_DATA.ctaSecondary.href),
    badges,
    is_active: Boolean((content as any)?.is_active ?? true),
    sort_order: Number((content as any)?.sort_order ?? 50),
  };
}

function splitLines(v: string): string[] {
  return String(v || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toData(values: FormValues): any {
  return {
    headerTitle: values.headerTitle,
    headerDescription: values.headerDescription,
    services: values.services.map((s) => ({
      id: 0,
      icon: s.icon,
      title: s.title,
      description: s.description,
      features: splitLines(s.featuresText),
      color: s.color,
      href: s.href,
    })),
    processTitle: values.processTitle,
    processDescription: values.processDescription,
    processSteps: values.processSteps.map((s) => ({
      step: s.step,
      title: s.title,
      description: s.description,
    })),
    ctaTitle: values.ctaTitle,
    ctaDescription: values.ctaDescription,
    ctaPrimary: { text: values.primaryCtaText, href: values.primaryCtaHref },
    ctaSecondary: { text: values.secondaryCtaText, href: values.secondaryCtaHref },
    ctaBadges: values.badges.map((b) => b.text).filter(Boolean),
  };
}

const SERVICE_ICON_OPTIONS = [
  { value: 'cog', label: 'Cog' },
  { value: 'wrench', label: 'Wrench' },
  { value: 'phone', label: 'Phone' },
  { value: 'truck', label: 'Truck' },
  { value: 'shield', label: 'Shield' },
  { value: 'cap', label: 'Cap' },
];
const COLOR_OPTIONS = [
  { value: 'bg-yellow-500', label: 'Yellow' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-orange-500', label: 'Orange' },
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-indigo-500', label: 'Indigo' },
];

export default function ServicesEditor({
  content,
  onSave,
}: {
  content?: HomepageContent | null;
  onSave: (payload: { data: any; title?: string; description?: string; button_text?: string; button_url?: string; is_active: boolean; sort_order: number }) => Promise<void>;
}) {
  const defaults = useMemo(() => fromContent(content), [content]);
  const { register, control, handleSubmit, reset, watch, formState } = useForm<FormValues>({ defaultValues: defaults });
  useEffect(() => reset(defaults), [defaults, reset]);

  const servicesFA = useFieldArray({ control, name: 'services' });
  const stepsFA = useFieldArray({ control, name: 'processSteps' });
  const badgesFA = useFieldArray({ control, name: 'badges' });

  const services = watch('services');
  const steps = watch('processSteps');
  const badges = watch('badges');

  const onSubmit = async (values: FormValues) => {
    const data = toData(values);
    await onSave({
      data,
      title: values.headerTitle,
      description: values.headerDescription,
      button_text: values.primaryCtaText,
      button_url: values.primaryCtaHref,
      is_active: values.is_active,
      sort_order: values.sort_order,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Header Title</label>
          <input {...register('headerTitle')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Header Description</label>
          <textarea rows={3} {...register('headerDescription')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="font-medium text-gray-900">Service Cards</div>
          <button
            type="button"
            onClick={() => servicesFA.append({ id: newId('service'), icon: 'cog', title: '', description: '', color: 'bg-yellow-500', href: '/contact', featuresText: '' })}
            className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </div>

        <SortableList
          items={(servicesFA.fields || []).map((f, i) => ({ id: String(f.id), _i: i }))}
          onReorder={(next) => {
            const nextItems = next.map((n) => services[n._i]);
            servicesFA.replace(nextItems as any);
          }}
        >
          {(item, drag) => {
            const idx = item._i as number;
            const s = services?.[idx];
            return (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    ref={drag.setActivatorNodeRef as any}
                    {...drag.attributes}
                    {...drag.listeners}
                    className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                    title="Drag to reorder"
                  >
                    <Bars3Icon className="h-5 w-5" />
                  </button>
                  <IconPreview name={String(s?.icon || 'cog')} />
                  <div className="flex-1 font-medium text-gray-900 truncate">{s?.title?.trim() ? s.title : `Service ${idx + 1}`}</div>
                  <button type="button" onClick={() => servicesFA.remove(idx)} className="p-2 rounded-md border border-gray-200 text-red-600 hover:bg-red-50" title="Delete">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Icon</label>
                    <select {...register(`services.${idx}.icon` as const)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      {SERVICE_ICON_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                    <select {...register(`services.${idx}.color` as const)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      {COLOR_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <input {...register(`services.${idx}.title` as const)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea rows={2} {...register(`services.${idx}.description` as const)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Link URL</label>
                    <input {...register(`services.${idx}.href` as const)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Features (1 per line)</label>
                    <textarea rows={4} {...register(`services.${idx}.featuresText` as const)} className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-xs" />
                  </div>
                </div>
              </div>
            );
          }}
        </SortableList>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="font-medium text-gray-900">Process Steps</div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Process Title</label>
          <input {...register('processTitle')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Process Description</label>
          <textarea rows={2} {...register('processDescription')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Steps</div>
          <button type="button" onClick={() => stepsFA.append({ id: newId('step'), step: '', title: '', description: '' })} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </div>

        <SortableList
          items={(stepsFA.fields || []).map((f, i) => ({ id: String(f.id), _i: i }))}
          onReorder={(next) => {
            const nextItems = next.map((n) => steps[n._i]);
            stepsFA.replace(nextItems as any);
          }}
        >
          {(item, drag) => {
            const idx = item._i as number;
            return (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    ref={drag.setActivatorNodeRef as any}
                    {...drag.attributes}
                    {...drag.listeners}
                    className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                  >
                    <Bars3Icon className="h-5 w-5" />
                  </button>
                  <div className="font-medium text-gray-900">Step</div>
                  <input {...register(`processSteps.${idx}.step` as const)} className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm" placeholder="01" />
                  <div className="flex-1" />
                  <button type="button" onClick={() => stepsFA.remove(idx)} className="p-2 rounded-md border border-gray-200 text-red-600 hover:bg-red-50">
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                    <input {...register(`processSteps.${idx}.title` as const)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <textarea rows={2} {...register(`processSteps.${idx}.description` as const)} className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                  </div>
                </div>
              </div>
            );
          }}
        </SortableList>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div className="font-medium text-gray-900">Bottom CTA</div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CTA Title</label>
          <input {...register('ctaTitle')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">CTA Description</label>
          <textarea rows={3} {...register('ctaDescription')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button Text</label>
            <input {...register('primaryCtaText')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Button URL</label>
            <input {...register('primaryCtaHref')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Button Text</label>
            <input {...register('secondaryCtaText')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Button URL</label>
            <input {...register('secondaryCtaHref')} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-medium text-gray-900">Badges</div>
          <button type="button" onClick={() => badgesFA.append({ id: newId('badge'), text: '' })} className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50">
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </div>
        <SortableList
          items={(badgesFA.fields || []).map((f, i) => ({ id: String(f.id), _i: i }))}
          onReorder={(next) => {
            const nextItems = next.map((n) => badges[n._i]);
            badgesFA.replace(nextItems as any);
          }}
        >
          {(item, drag) => {
            const idx = item._i as number;
            return (
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg p-3 bg-white">
                <button
                  type="button"
                  ref={drag.setActivatorNodeRef as any}
                  {...drag.attributes}
                  {...drag.listeners}
                  className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
                >
                  <Bars3Icon className="h-5 w-5" />
                </button>
                <input {...register(`badges.${idx}.text` as const)} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Badge text" />
                <button type="button" onClick={() => badgesFA.remove(idx)} className="p-2 rounded-md border border-gray-200 text-red-600 hover:bg-red-50">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            );
          }}
        </SortableList>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={() => reset(defaults)} className="px-4 py-2 rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50" disabled={formState.isSubmitting}>
          Reset
        </button>
        <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50" disabled={formState.isSubmitting}>
          Save
        </button>
      </div>
    </form>
  );
}

