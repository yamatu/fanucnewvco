'use client';

import { useEffect, useState } from 'react';
import {
  ArrowPathIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  EyeIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

type Props = {
  locale: string;
  selectedKey: string;
  version: number;
  onSelectSection: (sectionKey: string) => void;
};

const SECTION_LABELS: Record<string, { zh: string; en: string }> = {
  hero_section: { zh: '首屏 Hero', en: 'Hero' },
  company_stats: { zh: '公司数据', en: 'Company Stats' },
  featured_products: { zh: '推荐产品', en: 'Featured Products' },
  brands_section: { zh: '品牌', en: 'Brands' },
  repair_capabilities: { zh: '维修能力', en: 'Repair Capabilities' },
  services_section: { zh: '服务', en: 'Services' },
  home_blog: { zh: '文章', en: 'Featured Articles' },
  workshop_section: { zh: '工厂与车间', en: 'Workshop' },
};

export default function HomepageLivePreview({ locale, selectedKey, version, onSelectSection }: Props) {
  const zh = locale === 'zh';
  const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'vibocnc-homepage-edit') return;
      const sectionKey = String(event.data.sectionKey || '');
      if (sectionKey) onSelectSection(sectionKey);
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSelectSection]);

  const iframeWidth = viewport === 'mobile' ? 390 : undefined;

  return (
    <section className="overflow-hidden rounded-lg border border-slate-300 bg-slate-100 shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <EyeIcon className="h-5 w-5 text-blue-600" />
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              {zh ? '首页实时样式预览' : 'Live homepage preview'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {zh ? '点击橙色标识即可定位到对应编辑器' : 'Click an orange marker to open its editor'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-md border border-slate-200 bg-slate-50 p-1" role="group" aria-label={zh ? '预览尺寸' : 'Preview viewport'}>
            <button
              type="button"
              onClick={() => setViewport('desktop')}
              aria-pressed={viewport === 'desktop'}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium ${viewport === 'desktop' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <ComputerDesktopIcon className="h-4 w-4" />
              {zh ? '桌面' : 'Desktop'}
            </button>
            <button
              type="button"
              onClick={() => setViewport('mobile')}
              aria-pressed={viewport === 'mobile'}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium ${viewport === 'mobile' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600 hover:bg-white'}`}
            >
              <DevicePhoneMobileIcon className="h-4 w-4" />
              {zh ? '移动' : 'Mobile'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRefreshKey((value) => value + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            title={zh ? '刷新预览' : 'Refresh preview'}
            aria-label={zh ? '刷新预览' : 'Refresh preview'}
          >
            <ArrowPathIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex items-start justify-center overflow-auto p-3 sm:p-5">
        <div
          className={`relative overflow-hidden bg-white shadow-lg transition-[width] duration-200 ${viewport === 'mobile' ? 'rounded-[1.75rem] border-[8px] border-slate-800' : 'w-full max-w-[1280px] rounded-md border border-slate-300'}`}
          style={{ width: iframeWidth, height: viewport === 'mobile' ? 720 : 760 }}
        >
          <iframe
            key={`${version}-${refreshKey}`}
            title={zh ? 'Vibocnc 首页真实预览' : 'Vibocnc live homepage preview'}
            src="/?admin_preview=1"
            className="h-full w-full border-0 bg-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white px-4 py-3">
        <InformationCircleIcon className="h-4 w-4 text-slate-400" />
        <span className="mr-1 text-xs text-slate-500">{zh ? '当前编辑：' : 'Editing:'}</span>
        {Object.entries(SECTION_LABELS).map(([key, labels]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectSection(key)}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${selectedKey === key ? 'border-orange-300 bg-orange-50 text-orange-800' : 'border-slate-200 text-slate-600 hover:border-orange-200 hover:bg-orange-50'}`}
          >
            {zh ? labels.zh : labels.en}
          </button>
        ))}
      </div>
    </section>
  );
}
