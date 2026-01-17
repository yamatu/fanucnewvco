"use client";

import { getSiteUrl } from "@/lib/url";
import React from "react";
import { useAdminI18n } from "@/lib/admin-i18n";

interface SeoPreviewProps {
  title?: string;
  description?: string;
  sku?: string;
  name?: string;
}

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

function slugify(input: string | undefined): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rangeClass(value: number, idealMin: number, idealMax: number, softMin: number, softMax: number) {
  if (value >= idealMin && value <= idealMax) return "text-green-600";
  if (value >= softMin && value <= softMax) return "text-amber-600";
  return "text-red-600";
}

export default function SeoPreview({ title, description, sku, name }: SeoPreviewProps) {
  const { t } = useAdminI18n();
  const site = getSiteUrl();
  const path = `/products/${(sku || "SKU").trim()}${name ? `-${slugify(name)}` : ""}`;

  const displayTitle = (title || "").trim() || [name, sku].filter(Boolean).join(" - ") || "SEO 标题预览";
  const displayDescription = (description || "").trim() ||
    (name || sku
      ? `${name ? name + (sku ? ` (${sku})` : "") : sku} — In stock, fast global shipping, 1-year warranty.`
      : "在此填写 SEO 描述，建议 150-160 字符，包含价格、库存、发货与保修信息。");

  const titleLen = displayTitle.length;
  const descLen = displayDescription.length;

  const titleClass = rangeClass(titleLen, 50, 60, 35, 70);
  const descClass = rangeClass(descLen, 150, 160, 120, 180);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-gray-900">{t('seo.preview.title', 'Google Preview')}</h4>
        <div className="text-xs text-gray-500">{t('seo.preview.note', 'For reference only')}</div>
      </div>

      {/* SERP Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-[#1a0dab] text-[18px] leading-6 truncate">
          {displayTitle}
        </div>
        <div className="text-[#202124] text-sm mt-0.5 truncate">
          {site}
          <span className="text-gray-400">›</span>
          {path.replace(/^\//, "")}
        </div>
        <div className="text-[#4d5156] text-sm mt-1 line-clamp-3">
          {displayDescription}
        </div>
      </div>

      {/* Counters */}
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
          <div className="text-gray-600">
            {t('seo.preview.titleLen', 'Title length')}{' '}
            <span className="text-gray-400">({t('seo.preview.reco', 'Recommended {min}-{max}', { min: 50, max: 60 })})</span>
          </div>
          <div className={`font-medium ${titleClass}`}>
            {t('seo.preview.chars', '{count} chars', { count: clamp(titleLen, 0, 999) })}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-2 py-1.5">
          <div className="text-gray-600">
            {t('seo.preview.descLen', 'Description length')}{' '}
            <span className="text-gray-400">({t('seo.preview.reco', 'Recommended {min}-{max}', { min: 150, max: 160 })})</span>
          </div>
          <div className={`font-medium ${descClass}`}>
            {t('seo.preview.chars', '{count} chars', { count: clamp(descLen, 0, 999) })}
          </div>
        </div>
      </div>
    </div>
  );
}
