'use client';

import Link from 'next/link';
import type { HomepageContent } from '@/types';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';

type BrandItem = { name: string; focus: string; href: string };

const DEFAULT_BRANDS: BrandItem[] = [
  { name: 'FANUC', focus: 'CNC, robot and motion parts', href: '/categories/fanuc' },
  { name: 'Siemens', focus: 'PLC, HMI and drive systems', href: '/products?search=Siemens' },
  { name: 'Mitsubishi', focus: 'Servo, PLC and inverter parts', href: '/categories/mitsubishi' },
  { name: 'ABB', focus: 'Drives and automation components', href: '/products?search=ABB' },
  { name: 'Omron', focus: 'Controllers, sensors and HMI', href: '/products?search=Omron' },
  { name: 'Yaskawa', focus: 'Servo and drive components', href: '/products?search=Yaskawa' },
  { name: 'Schneider', focus: 'PLC, HMI and power control', href: '/products?search=Schneider' },
  { name: 'Allen-Bradley', focus: 'PLC and factory control parts', href: '/products?search=Allen-Bradley' },
  { name: 'Bosch Rexroth', focus: 'Motion and drive technology', href: '/products?search=Bosch%20Rexroth' },
  { name: 'Danfoss', focus: 'Industrial drives and controls', href: '/products?search=Danfoss' },
  { name: 'SICK', focus: 'Sensors, safety, encoders and vision', href: '/categories/sick' },
  { name: 'Tamagawa', focus: 'Encoders, resolvers and servo feedback', href: '/categories/tamagawa' },
];

function parseData(content?: HomepageContent | null) {
  const raw = content?.data;
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return raw as Record<string, unknown>;
}

export default function BrandsSection({ content }: { content?: HomepageContent | null }) {
  const { href } = usePublicI18n();
  const data = parseData(content);
  const brands = Array.isArray(data?.brands) && data.brands.length > 0
    ? data.brands as BrandItem[]
    : DEFAULT_BRANDS;
  const title = content?.title || 'Brands We Supply';
  const description = content?.description
    || 'We source current, legacy and obsolete automation components from leading industrial manufacturers. Send us the exact part number when a model is difficult to find.';
  const buttonText = content?.button_text || 'Browse All Automation Parts';
  const buttonUrl = content?.button_url || '/products';

  return (
    <section id="brands-we-supply" className="home-deferred-section border-y border-slate-200 bg-[#eef3f8] py-16 lg:py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.78fr_2.22fr] lg:px-8">
        <div className="self-center">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#0b3e75]">Multi-brand supply</p>
          <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{title}</h2>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">{description}</p>
          <Link href={href(buttonUrl)} className="mt-7 inline-flex items-center gap-2 font-bold text-[#0b3e75] hover:text-orange-700">
            {buttonText}<span aria-hidden="true">→</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {brands.slice(0, 15).map((brand) => (
            <Link
              key={brand.name}
              href={href(brand.href || `/products?brand=${encodeURIComponent(brand.name)}`)}
              className="group flex min-h-32 flex-col justify-between rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-lg"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-blue-50 text-lg font-black text-[#0b3e75]">
                {brand.name.replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase()}
              </span>
              <span>
                <strong className="block text-base text-slate-950 group-hover:text-[#0b3e75]">{brand.name}</strong>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{brand.focus}</span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
