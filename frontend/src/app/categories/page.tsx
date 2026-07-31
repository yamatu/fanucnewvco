import type { Metadata } from 'next';
import Link from 'next/link';
import PublicLayout from '@/components/layout/PublicLayout';
import { CategoryService } from '@/services/category.service';
import { getLocalizedMetadataPaths, getRequestPublicLocale } from '@/lib/i18n/server';
import { localizeCategoryContent } from '@/lib/i18n/content';
import { localizePublicPath } from '@/lib/i18n/config';
import { getSiteUrl } from '@/lib/url';
import { SITE_NAME } from '@/lib/seo';
import type { Category } from '@/types';

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, canonical, languages } = await getLocalizedMetadataPaths('/categories');
  const localized = {
    en: { title: 'Industrial Automation Product Categories', description: 'Browse multi-brand industrial automation parts by manufacturer and equipment type, including PLC, HMI, servo, drive, motor, power supply and control components.' },
    zh: { title: '工业自动化产品分类', description: '按制造商和设备类型浏览多品牌工业自动化零部件，包括 PLC、HMI、伺服、驱动器、电机、电源和控制组件。' },
  }[locale as 'en' | 'zh'];
  const title = localized?.title || 'Industrial Automation Product Categories';
  const description = localized?.description || 'Browse multi-brand industrial automation parts by manufacturer and equipment type, including PLC, HMI, servo, drive, motor, power supply and control components.';
  return {
    title,
    description,
    alternates: { canonical, languages },
    openGraph: { title: `${title} | ${SITE_NAME}`, description, type: 'website', url: canonical },
  };
}

function categoryPath(category: Category): string {
  return `/categories/${category.path || category.slug}`;
}

export default async function CategoriesPage() {
  const locale = await getRequestPublicLocale();
  const copy = locale === 'zh'
    ? {
        kicker: '多品牌产品目录',
        title: '工业自动化产品分类',
        intro: '按制造商和设备系列查找自动化零部件，并通过每个分类继续浏览现有、老旧及停产型号。',
        browse: '浏览',
        empty: '产品分类正在更新。',
        all: '浏览全部产品',
        parts: '全部自动化零部件',
        repair: '维修评估',
        blog: '技术博客',
      }
    : {
        kicker: 'Multi-brand catalogue',
        title: 'Industrial Automation Product Categories',
        intro: 'Explore automation parts by manufacturer and equipment family, then follow each category to current, legacy and obsolete product models.',
        browse: 'Browse',
        empty: 'Product categories are being updated.',
        all: 'Browse all products',
        parts: 'All automation parts',
        repair: 'Repair evaluation',
        blog: 'Technical blog',
      };
  let categories: Category[] = [];
  try {
    categories = (await CategoryService.getCategories()).map((category) => localizeCategoryContent(category, locale));
  } catch (error) {
    console.error('Failed to load categories index:', error);
  }

  const baseUrl = getSiteUrl();
  const pageUrl = `${baseUrl}${localizePublicPath('/categories', locale)}`;
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: copy.title,
    description: copy.intro,
    url: pageUrl,
    isPartOf: { '@type': 'WebSite', '@id': `${baseUrl}/#website`, name: SITE_NAME, url: baseUrl },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: categories.map((category, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: category.name,
        url: `${baseUrl}${localizePublicPath(categoryPath(category), locale)}`,
      })),
    },
  };
  const breadcrumbData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'zh' ? '首页' : 'Home',
        item: `${baseUrl}${localizePublicPath('/', locale)}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: copy.title,
        item: pageUrl,
      },
    ],
  };

  return (
    <PublicLayout>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbData) }} />
      <div className="site-page-shell min-h-screen">
        <section className="site-page-hero py-14 sm:py-20">
          <div className="site-hero-inner mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
            <div className="site-hero-kicker mb-5">{copy.kicker}</div>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">{copy.title}</h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-blue-100">
              {copy.intro}
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
          {categories.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {categories.map((category) => (
                <article key={category.id} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-950">
                    <Link href={localizePublicPath(categoryPath(category), locale)} className="hover:text-[#0b3e75]">
                      {category.name}
                    </Link>
                  </h2>
                  {category.description && <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{category.description}</p>}
                  {Array.isArray(category.children) && category.children.length > 0 && (
                    <ul className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                      {category.children.slice(0, 8).map((child) => (
                        <li key={child.id}>
                          <Link href={localizePublicPath(categoryPath(child), locale)} className="text-sm font-medium text-[#0b3e75] hover:text-orange-700">
                            {child.name} →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Link href={localizePublicPath(categoryPath(category), locale)} className="mt-6 inline-flex font-bold text-[#0b3e75] hover:text-orange-700">
                    {copy.browse} {category.name} →
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-slate-600">
              {copy.empty} <Link href={localizePublicPath('/products', locale)} className="font-bold text-[#0b3e75]">{copy.all}</Link>.
            </div>
          )}

          <div className="mt-12 grid gap-4 rounded-xl bg-slate-950 p-7 text-white sm:grid-cols-3">
            <Link href={localizePublicPath('/products', locale)} className="rounded-lg border border-slate-700 p-5 hover:border-orange-400">{copy.parts} →</Link>
            <Link href={localizePublicPath('/repair-request', locale)} className="rounded-lg border border-slate-700 p-5 hover:border-orange-400">{copy.repair} →</Link>
            <Link href={localizePublicPath('/blog', locale)} className="rounded-lg border border-slate-700 p-5 hover:border-orange-400">{copy.blog} →</Link>
          </div>
        </section>
      </div>
    </PublicLayout>
  );
}
