'use client';

import Link from 'next/link';
import {
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import FooterSocialLinks from '@/components/social/FooterSocialLinks';
import { useSiteContactInfo } from '@/components/layout/ContactInfoProvider';

const footerNavigation = {
  products: [
    { name: 'FANUC Parts', href: '/categories/fanuc' },
    { name: 'Siemens Parts', href: '/categories/siemens' },
    { name: 'Mitsubishi Parts', href: '/categories/mitsubishi' },
    { name: 'ABB Automation', href: '/categories/abb' },
    { name: 'Allen-Bradley (AB)', href: '/categories/ab' },
  ],
  services: [
    { name: 'Automation Parts Sales', href: '/products' },
    { name: 'Functional Testing', href: '/about' },
    { name: 'Technical Support', href: '/technical-support' },
    { name: 'Track Order', href: '/track-order' },
    { name: 'Global Shipping', href: '/shipping-policy' },
  ],
  company: [
    { name: 'About Vcocnc', href: '/about' },
    { name: 'Product Categories', href: '/categories' },
    { name: 'News & Guides', href: '/news' },
    { name: 'Contact Us', href: '/contact' },
  ],
  support: [
    { name: 'Contact Us', href: '/contact' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Documentation', href: '/docs' },
    { name: 'Warranty Policy', href: '/warranty-policy' },
    { name: 'Shipping Policy', href: '/shipping-policy' },
    { name: 'Technical Support', href: '/technical-support' },
    { name: 'Returns & Refunds', href: '/returns' },
  ],
  partners: [
    { name: 'About Vcocnc', href: '/about', external: false },
    { name: 'Product Categories', href: '/categories', external: false },
    { name: 'All Products', href: '/products', external: false },
    { name: 'Request a Quote', href: '/contact', external: false },
  ],
};

export function Footer() {
  const contact = useSiteContactInfo();

  return (
    <footer className="bg-gray-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-yellow-500 text-black px-4 py-2 rounded-lg font-bold text-xl">
                Vcocnc
              </div>
              <div>
                <div className="text-xl font-bold">CNC Solutions</div>
                <div className="text-sm text-gray-400">Since 2005</div>
              </div>
            </div>

            <p className="text-gray-300 mb-6 max-w-md">
              FANUC, Siemens, Mitsubishi, ABB and AB automation parts, stocked, tested and
              shipped worldwide from Kunshan, China.
            </p>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MapPinIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <span className="text-gray-300">
                  Kunshan, Jiangsu Province, China
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <PhoneIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <span className="text-gray-300">{contact.phone}</span>
              </div>

              <div className="flex items-center space-x-3">
                <EnvelopeIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <span className="text-gray-300">{contact.email}</span>
              </div>

              <div className="flex items-center space-x-3">
                <ClockIcon className="h-5 w-5 text-yellow-400 flex-shrink-0" />
                <span className="text-gray-300">{contact.hoursSummary}</span>
              </div>
            </div>

            <FooterSocialLinks />
          </div>

          {/* Products */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Products</h3>
            <ul className="space-y-2">
              {footerNavigation.products.map((item) => (
                <li key={item.name}>
                  <Link prefetch={false}
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Services</h3>
            <ul className="space-y-2">
              {footerNavigation.services.map((item) => (
                <li key={item.name}>
                  <Link prefetch={false}
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              {footerNavigation.support.map((item) => (
                <li key={item.name}>
                  <Link prefetch={false}
                    href={item.href}
                    className="text-gray-300 hover:text-white transition-colors duration-200"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Partners & Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Partners</h3>
            <ul className="space-y-2">
              {footerNavigation.partners.map((item) => (
                <li key={item.name}>
                  <Link prefetch={false}
                    href={item.href}
                    {...(item.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="text-gray-300 hover:text-white transition-colors duration-200 flex items-center"
                  >
                    {item.name}
                    {item.external && (
                      <svg className="w-3 h-3 ml-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                        <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
                      </svg>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup & Payment Methods */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">Stay Updated</h3>
            <p id="newsletter-description" className="text-gray-300 mb-4">
              Subscribe to our newsletter for the latest automation components and industry updates.
            </p>
            <form className="flex" action="/contact" method="get">
              <label htmlFor="newsletter-email" className="sr-only">
                Email address for newsletter updates
              </label>
              <input
                id="newsletter-email"
                name="email"
                type="email"
                autoComplete="email"
                aria-describedby="newsletter-description"
                placeholder="Enter your email"
                className="flex-1 min-w-0 px-4 py-2 bg-gray-800 border border-gray-700 rounded-l-md focus:outline-none focus:ring-2 focus:ring-yellow-500 text-white placeholder-gray-400"
              />
              <button
                type="submit"
                className="shrink-0 px-4 sm:px-6 py-2 bg-yellow-500 text-black rounded-r-md hover:bg-yellow-600 transition-colors duration-200 font-semibold"
              >
                Subscribe
              </button>
            </form>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-300">
            <span>We accept (USD):</span>
            <span className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 font-bold text-[#003087]">PayPal</span>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Vcocnc. All rights reserved.
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 md:mt-0">
              <Link prefetch={false}
                href="/privacy"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Privacy Policy
              </Link>
              <Link prefetch={false}
                href="/terms"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Terms of Service
              </Link>
              <Link prefetch={false}
                href="/sitemap.xml"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Sitemap
              </Link>
              <Link prefetch={false} href="/returns" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Returns &amp; Refunds
              </Link>
              <Link prefetch={false} href="/shipping-policy" className="text-gray-400 hover:text-white text-sm transition-colors duration-200">
                Shipping Policy
              </Link>
              <Link prefetch={false}
                href="/products"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                Product Categories
              </Link>
              <Link prefetch={false}
                href="/products"
                className="text-gray-400 hover:text-white text-sm transition-colors duration-200"
              >
                All Products
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
