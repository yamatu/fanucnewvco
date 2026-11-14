import Image from 'next/image';
import { getSiteUrl } from '@/lib/url';
import { generateBreadcrumbSchema } from '@/lib/structured-data';
import {
  BuildingOfficeIcon,
  UserGroupIcon,
  CubeIcon,
  TruckIcon,
  ChartBarIcon,
  ClockIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { createPageText, type PageData } from '@/lib/page-content';
import { ABOUT_PAGE_SCHEMA } from '@/lib/page-content-schema';

// Admin-entered URLs may point at hosts outside next.config images.remotePatterns.
const isExternal = (src: string) => /^https?:\/\//i.test(src);

export default function AboutPageView({ data }: { data: PageData }) {
  const baseUrl = getSiteUrl();
  const text = createPageText(ABOUT_PAGE_SCHEMA, data);
  const heroImage = text('heroImage');
  const heroStyle = heroImage
    ? { backgroundImage: `linear-gradient(rgba(234, 179, 8, 0.85), rgba(202, 138, 4, 0.85)), url(${JSON.stringify(heroImage)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
  const profileImage = text('profileImage');
  const experienceImage = text('experienceImage');

  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: baseUrl },
    { name: 'About', url: `${baseUrl}/about` },
  ]);

  const aboutPageSchema = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": text('heroTitle'),
    "description": "Learn about Vcocnc, a top 3 FANUC parts supplier in China since 2005.",
    "url": `${baseUrl}/about`,
    "mainEntity": {
      "@type": "Organization",
      "name": "Vcocnc",
      "foundingDate": "2005",
      "foundingLocation": {
        "@type": "Place",
        "name": "Kunshan, Jiangsu, China"
      },
      "numberOfEmployees": {
        "@type": "QuantitativeValue",
        "value": 37
      },
      "description": "One of the top three FANUC suppliers in China with 100,000+ items regularly stocked, serving customers worldwide with industrial automation components.",
      "knowsAbout": [
        "FANUC CNC parts",
        "Industrial automation",
        "Servo motors",
        "PCB boards",
        "I/O modules",
        "PLC",
        "HMI",
        "Inverters",
        "Encoders",
        "Amplifiers"
      ],
      "slogan": "Your Trusted FANUC Parts Partner Since 2005"
    }
  };

  const combinedSchema = {
    "@context": "https://schema.org",
    "@graph": [aboutPageSchema, breadcrumbSchema]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(combinedSchema) }}
      />
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-yellow-500 to-yellow-600 text-black py-24" style={heroStyle}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{text('heroTitle')}</h1>
            <p className="whitespace-pre-line text-xl md:text-2xl text-yellow-900 max-w-3xl mx-auto">
              {text('heroSubtitle')}
            </p>
          </div>
        </div>
      </section>

      {/* Company Profile */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                {text('profileTitle')}
              </h2>
              <p className="whitespace-pre-line text-lg text-gray-700 mb-6 leading-relaxed">
                {text('profileText1')}
              </p>
              <p className="whitespace-pre-line text-lg text-gray-700 mb-6 leading-relaxed">
                {text('profileText2')}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{text('profileStat1Value')}</div>
                  <div className="text-sm text-gray-600">{text('profileStat1Label')}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">{text('profileStat2Value')}</div>
                  <div className="text-sm text-gray-600">{text('profileStat2Label')}</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <Image
                src={profileImage}
                alt={text('heroTitle')}
                width={600}
                height={400}
                unoptimized={isExternal(profileImage)}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Company Stats */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {text('facilityTitle')}
            </h2>
            <p className="whitespace-pre-line text-lg text-gray-600 max-w-3xl mx-auto">
              {text('facilityText')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: BuildingOfficeIcon, n: 1 },
              { icon: UserGroupIcon, n: 2 },
              { icon: CubeIcon, n: 3 },
              { icon: TruckIcon, n: 4 },
            ].map(({ icon: Icon, n }) => (
              <div key={n} className="text-center bg-white p-8 rounded-lg shadow-lg">
                <Icon className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
                <div className="text-3xl font-bold text-gray-900 mb-2">{text(`stat${n}Value`)}</div>
                <div className="text-gray-600">{text(`stat${n}Label`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Professional Service */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {text('servicesTitle')}
            </h2>
            <p className="whitespace-pre-line text-lg text-gray-600 max-w-3xl mx-auto">
              {text('servicesText')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: ChartBarIcon, n: 1 },
              { icon: ClockIcon, n: 2 },
              { icon: WrenchScrewdriverIcon, n: 3 },
            ].map(({ icon: Icon, n }) => (
              <div key={n} className="text-center p-6">
                <Icon className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{text(`service${n}Title`)}</h3>
                <p className="whitespace-pre-line text-gray-600">{text(`service${n}Text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experience Section */}
      <section className="py-16 bg-yellow-600 text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                {text('experienceTitle')}
              </h2>
              <p className="whitespace-pre-line text-lg text-yellow-900 mb-6 leading-relaxed">
                {text('experienceText')}
              </p>
              <div className="flex items-center space-x-4">
                <ShieldCheckIcon className="h-12 w-12 text-yellow-800" />
                <div>
                  <div className="text-xl font-semibold">{text('trustTitle')}</div>
                  <div className="text-yellow-900">{text('trustText')}</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <Image
                src={experienceImage}
                alt={text('experienceTitle')}
                width={600}
                height={400}
                unoptimized={isExternal(experienceImage)}
                className="rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
