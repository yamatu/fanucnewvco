'use client';

import Link from 'next/link';
import Image from 'next/image';
import { getSiteUrl } from '@/lib/url';
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6';
import { queryKeys } from '@/lib/react-query';
import type { SocialMediaURLKey } from '@/lib/social-media';
import { SocialMediaService } from '@/services/social-media.service';
import { usePublicI18n } from '@/lib/i18n/PublicI18nProvider';

const footerNavigation = {
  products: [
    { name: 'FANUC Amplifiers', href: '/categories/fanuc/fanuc-servo-amplifier-drive' },
    { name: 'Servo Motors', href: '/categories/fanuc/fanuc-servo-motor' },
    { name: 'Encoders', href: '/categories/fanuc/fanuc-encoder-feedback' },
    { name: 'PLC Modules', href: '/categories/fanuc/fanuc-i-o-module' },
    { name: 'Power Supplies', href: '/categories/fanuc/fanuc-power-supply' },
  ],
  services: [
    { name: 'FANUC Parts Sales', href: '/about' },
    { name: 'Testing Service', href: '/about' },
    { name: 'Maintenance Service', href: '/about' },
    { name: 'Technical Support', href: '/contact' },
    { name: 'Global Shipping', href: '/contact' },
  ],
  company: [
    { name: 'About VIBO CNC', href: '/about' },
    { name: 'Product Categories', href: '/products' },
    { name: 'FANUC Partners', href: '/about' },
    { name: 'Our Workshop', href: '/about' },
    { name: 'Company Profile', href: '/about' },
    { name: 'News', href: '/news' },
    { name: 'Blog', href: '/blog' },
  ],
  support: [
    { name: 'Contact Us', href: '/contact' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Warranty', href: '/warranty' },
    { name: 'Warranty Policy', href: '/warranty-policy' },
    { name: 'Shipping Policy', href: '/shipping-policy' },
    { name: 'Technical Support', href: '/technical-support' },
    { name: 'Returns Policy', href: '/returns' },
  ],
  partners: [
    { name: 'VIBO CNC Main Site', href: 'https://www.vibocnc.com', external: true },
    { name: 'FANUC Official', href: 'https://www.fanuc.com', external: true },
    { name: 'Industrial Partners', href: '/about' },
    { name: 'Authorized Dealers', href: '/contact' },
  ],
};

const socialPlatforms: Array<{
  key: SocialMediaURLKey;
  name: string;
  Icon: typeof FaXTwitter;
}> = [
  { key: 'x_url', name: 'X', Icon: FaXTwitter },
  { key: 'facebook_url', name: 'Facebook', Icon: FaFacebookF },
  { key: 'instagram_url', name: 'Instagram', Icon: FaInstagram },
  { key: 'linkedin_url', name: 'LinkedIn', Icon: FaLinkedinIn },
];

export function Footer() {
  const { t, href } = usePublicI18n();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const siteUrl = getSiteUrl();
  const { data: socialSettings } = useQuery({
    queryKey: queryKeys.socialMedia.public(),
    queryFn: () => SocialMediaService.getPublic(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  const socialLinks = socialPlatforms.flatMap((platform) => {
    const href = String(socialSettings?.[platform.key] || '').trim();
    return href ? [{ ...platform, href }] : [];
  });

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = new URL(siteUrl || window.location.origin);
      url.pathname = href('/contact');
      if (newsletterEmail && newsletterEmail.trim()) {
        url.searchParams.set('email', newsletterEmail.trim());
      }
      window.location.href = url.toString();
    } catch {
      // Fallback to relative navigation
      const qs = newsletterEmail && newsletterEmail.trim() ? `?email=${encodeURIComponent(newsletterEmail.trim())}` : '';
      window.location.href = href(`/contact${qs}`);
    }
  };
  return (
    <footer className="bg-slate-950 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-7">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="rounded-md bg-white px-3 py-2">
                <Image
                  src="/images/vibocnc-logo.png"
                  alt="ViboCNC"
                  width={150}
                  height={40}
                  className="h-9 w-auto object-contain"
                />
              </div>
              <div>
                <div className="text-xl font-bold">{t('header.hub')}</div>
                <div className="text-sm text-slate-400">{t('footer.since')}</div>
              </div>
            </div>

            <p className="text-slate-300 mb-6 max-w-md">{t('footer.description')}</p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPinIcon className="h-5 w-5 text-orange-300 flex-shrink-0" />
                <span className="text-slate-300">
                  {t('footer.address')}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-orange-300 flex-shrink-0" />
                <span className="text-slate-300">+86 13348028050</span>
              </div>

              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-5 w-5 text-orange-300 flex-shrink-0" />
                <span className="text-slate-300">sales@vibocnc.com</span>
              </div>

              <div className="flex items-center space-x-3">
                <ClockIcon className="h-5 w-5 text-orange-300 flex-shrink-0" />
                <span className="text-slate-300">{t('footer.hours')}</span>
              </div>
            </div>

            {socialLinks.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2" aria-label="VIBO CNC social media">
                {socialLinks.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="me noopener noreferrer"
                    aria-label={`Follow VIBO CNC on ${name}`}
                    title={name}
                    className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-700 text-slate-300 transition-colors hover:border-orange-400 hover:bg-orange-500 hover:text-white focus:outline-none focus:ring-2 focus:ring-orange-300"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Products */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.products')}</h3>
            <ul className="space-y-2">
              {footerNavigation.products.map((item) => (
                <li key={item.name}>
                  <Link
                    href={href(item.href)}
                    className="text-slate-300 hover:text-orange-200 transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.services')}</h3>
            <ul className="space-y-2">
              {footerNavigation.services.map((item) => (
                <li key={item.name}>
                  <Link
                    href={href(item.href)}
                    className="text-slate-300 hover:text-orange-200 transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.company')}</h3>
            <ul className="space-y-2">
              {footerNavigation.company.map((item) => (
                <li key={item.name}>
                  <Link
                    href={href(item.href)}
                    className="text-slate-300 hover:text-orange-200 transition-colors duration-200"
                  >
                    {item.name === 'News' ? t('nav.news') : item.name === 'Blog' ? t('nav.blog') : item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.support')}</h3>
            <ul className="space-y-2">
              {footerNavigation.support.map((item) => (
                <li key={item.name}>
                  <Link
                    href={href(item.href)}
                    className="text-slate-300 hover:text-orange-200 transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Partners & Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.partners')}</h3>
            <ul className="space-y-2">
              {footerNavigation.partners.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.external ? item.href : href(item.href)}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="text-slate-300 hover:text-orange-200 transition-colors duration-200 flex items-center"
                  >
                    {item.name}
                    {item.external && (
                      <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <div className="max-w-md">
            <h3 className="text-lg font-semibold mb-4">{t('footer.stayUpdated')}</h3>
            <p className="text-slate-300 mb-4">
              {t('footer.newsletter')}
            </p>
            <form className="flex" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder={t('footer.emailPlaceholder')}
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                className="flex-1 px-4 py-2 bg-slate-900 border border-slate-700 rounded-l-md focus:outline-none focus:ring-2 focus:ring-[#003a78] text-white placeholder-slate-400"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-orange-700 text-white rounded-r-md hover:bg-[#003a78] transition-colors duration-200 font-semibold"
              >
                {t('footer.subscribe')}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-slate-400 text-sm">
              {t('footer.copyright')}
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 md:mt-0">
              <Link
                href={href('/privacy')}
                className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
              >
                {t('footer.privacy')}
              </Link>
              <Link
                href={href('/terms')}
                className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
              >
                {t('footer.terms')}
              </Link>
              <Link
                href="/sitemap.xml"
                className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
              >
                {t('footer.sitemap')}
              </Link>
              <Link
                href="https://www.vibocnc.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-white text-sm transition-colors duration-200 flex items-center"
              >
                vibocnc.com
                <ExternalLink className="ml-1 h-3 w-3" aria-hidden="true" />
              </Link>
              <Link
                href={href('/products')}
                className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
              >
                {t('footer.productCategories')}
              </Link>
              <Link
                href={href('/products')}
                className="text-slate-400 hover:text-white text-sm transition-colors duration-200"
              >
                {t('footer.allProducts')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
