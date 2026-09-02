import Link from 'next/link';
import { getImageProps } from 'next/image';
import type { HomepageContent } from '@/types';
import { DEFAULT_HERO_DATA, type HeroSectionData } from '@/lib/homepage-defaults';
import HeroCarouselControls from './HeroCarouselControls';

type Props = { content?: HomepageContent | null };

function getDescriptiveCtaText(text: string, href: string, slideTitle: string): string {
  if (!/^(learn|read|view) more$/i.test(text.trim())) return text;
  if (href === '/about') return 'About Vcocnc';
  if (href === '/contact') return 'Contact Vcocnc';
  if (href === '/categories') return 'Browse Product Categories';
  return `Explore ${slideTitle}`;
}

function normalizeHeroData(content?: HomepageContent | null): HeroSectionData {
  const raw = content?.data;
  const parsed = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return null; } })() : raw;

  // Start from structured data if provided, otherwise defaults.
  const baseSlides = Array.isArray(parsed?.slides) && parsed.slides.length > 0 ? parsed.slides : DEFAULT_HERO_DATA.slides;
  const autoPlayMs = typeof parsed?.autoPlayMs === 'number' ? parsed.autoPlayMs : DEFAULT_HERO_DATA.autoPlayMs;

  // Backwards-compatible override: if admin only edited simple fields (title/subtitle/etc),
  // reflect those changes in the first slide even when `data` is null.
  const slides = [...baseSlides];
  if (slides.length > 0) {
    const s0 = { ...slides[0] };
    if (content?.title) s0.title = content.title;
    if (content?.subtitle) s0.subtitle = content.subtitle;
    if (content?.description) s0.description = content.description;
    if (content?.image_url) s0.image = content.image_url;
    if (content?.button_text) s0.cta = { ...(s0.cta || {}), primary: { ...(s0.cta?.primary || {}), text: content.button_text, href: content.button_url || s0.cta?.primary?.href || '/products' }, secondary: s0.cta?.secondary || { text: 'Learn More', href: '/about' } };
    slides[0] = s0;
  }

  return { slides, autoPlayMs };
}

export function HeroSection({ content }: Props) {
  const heroData = normalizeHeroData(content);
  const slides = heroData.slides;
  const autoPlayMs = heroData.autoPlayMs || 6000;
  const initialSlide = slides[0];

  if (!initialSlide) return null;

  const { props: initialImageProps } = getImageProps({
    src: initialSlide.image,
    alt: initialSlide.title,
    width: 1920,
    height: 1080,
    quality: 70,
    sizes: '100vw',
    priority: true,
    fetchPriority: 'high',
    decoding: 'sync',
  });

  return (
    <section className="relative w-full h-screen min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Keep the LCP image outside the carousel's client hydration boundary. */}
      <div className="absolute inset-0 h-full w-full">
        {/* getImageProps keeps Next.js optimization without hydrating the LCP element. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          {...initialImageProps}
          alt={initialSlide.title}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/40" />
      </div>

      {/* The initial slide is server-rendered so its LCP paint is not gated by hydration. */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto bg-white bg-opacity-90 rounded-2xl p-8 md:p-12 shadow-2xl">
          <div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-gray-900">
              {initialSlide.title}
            </h1>

            <p className="text-xl md:text-2xl lg:text-3xl font-light mb-8 text-yellow-600">
              {initialSlide.subtitle}
            </p>

            <p className="text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed text-gray-700">
              {initialSlide.description}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={initialSlide.cta.primary.href}
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                {getDescriptiveCtaText(initialSlide.cta.primary.text, initialSlide.cta.primary.href, initialSlide.title)}
              </Link>

              <Link
                href={initialSlide.cta.secondary.href}
                className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-black px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
              >
                {getDescriptiveCtaText(initialSlide.cta.secondary.text, initialSlide.cta.secondary.href, initialSlide.title)}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <HeroCarouselControls slides={slides} autoPlayMs={autoPlayMs} />

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 right-8 z-20 text-white animate-bounce">
        <div className="flex flex-col items-center">
          <span className="text-sm mb-2">Scroll Down</span>
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 14l-7 7m0 0l-7-7m7 7V3"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
