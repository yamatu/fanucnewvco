'use client';

import { useState } from 'react';
import Image from 'next/image';
import { 
  CheckCircleIcon, 
  CogIcon, 
  ShieldCheckIcon, 
  TruckIcon,
  WrenchScrewdriverIcon,
  BeakerIcon,
  ArchiveBoxIcon,
  ClipboardDocumentCheckIcon
} from '@heroicons/react/24/outline';

const facilities = [
  {
    id: 1,
    title: 'Testing & Quality Control',
    description: 'State-of-the-art testing equipment ensures all parts meet FANUC specifications and industry standards.',
    image: 'https://s2.loli.net/2025/09/01/ZxuFKAvIM3zUHj4.jpg',
    icon: BeakerIcon,
    features: [
      'Automated testing systems',
      'Quality certification process',
      'Performance validation',
      'Compliance verification'
    ]
  },
  {
    id: 2,
    title: 'Organized Storage',
    description: 'Climate-controlled warehouse with systematic inventory management for optimal part preservation.',
    image: 'https://s2.loli.net/2025/09/01/pxWRrVkNlO8Ugm4.jpg',
    icon: ArchiveBoxIcon,
    features: [
      'Climate-controlled environment',
      'Systematic organization',
      'Real-time inventory tracking',
      'Secure storage protocols'
    ]
  },
  {
    id: 3,
    title: 'Repair & Refurbishment',
    description: 'Professional repair services with original FANUC parts and certified procedures.',
    image: 'https://s2.loli.net/2025/09/01/wMHu93Fv5egJ6pn.jpg',
    icon: WrenchScrewdriverIcon,
    features: [
      'Certified technicians',
      'Original FANUC procedures',
      'Advanced diagnostic tools',
      'Quality assurance testing'
    ]
  },
  {
    id: 4,
    title: 'Secure Packaging',
    description: 'Professional packaging ensures safe delivery of sensitive electronic components worldwide.',
    image: 'https://s2.loli.net/2025/09/01/3Rli1zNOEm5sA4T.jpg',
    icon: ShieldCheckIcon,
    features: [
      'Anti-static packaging',
      'Shock-resistant materials',
      'Custom protective solutions',
      'International shipping standards'
    ]
  }
];

const capabilities = [
  {
    icon: CogIcon,
    title: 'Advanced Manufacturing',
    description: 'Precision manufacturing with cutting-edge technology'
  },
  {
    icon: ClipboardDocumentCheckIcon,
    title: 'Quality Assurance',
    description: 'Rigorous testing and certification processes'
  },
  {
    icon: TruckIcon,
    title: 'Global Logistics',
    description: 'Worldwide shipping and distribution network'
  },
  {
    icon: CheckCircleIcon,
    title: 'ISO Certified',
    description: 'International quality management standards'
  }
];

export function WorkshopSection() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            5,000sqm Modern Workshop Facility
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Our state-of-the-art facility combines advanced technology with expert craftsmanship 
            to deliver exceptional FANUC parts and services.
          </p>
        </div>

        {/* Facility Tabs */}
        <div className="mb-16">
          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center mb-8 border-b border-gray-200">
            {facilities.map((facility, index) => (
              <button
                key={facility.id}
                onClick={() => setActiveTab(index)}
                className={`px-6 py-3 font-medium text-sm md:text-base transition-colors duration-300 border-b-2 ${
                  activeTab === index
                    ? 'border-yellow-600 text-yellow-600'
                    : 'border-transparent text-gray-600 hover:text-yellow-600'
                }`}
              >
                {facility.title}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {facilities.map((facility, index) => (
              <div
                key={facility.id}
                className={`${activeTab === index ? 'block' : 'hidden'}`}
              >
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
                  {/* Image */}
                  <div className="relative h-96 lg:h-auto">
                    <Image
                      src={facility.image}
                      alt={facility.title}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 50vw"
                      className="object-cover"
                      onError={(e) => {
                        console.error('Image failed to load:', facility.image);
                        // 可以设置备用图片
                        // e.currentTarget.src = '/fallback-image.jpg';
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', facility.image);
                      }}
                      priority={activeTab === index}
                    />
                  </div>

                  {/* Content */}
                  <div className="p-8 lg:p-12 flex flex-col justify-center">
                    <div className="flex items-center mb-6">
                      <div className="bg-yellow-100 p-3 rounded-full mr-4">
                        <facility.icon className="h-8 w-8 text-yellow-600" />
                      </div>
                      <h3 className="text-2xl font-bold text-gray-900">
                        {facility.title}
                      </h3>
                    </div>

                    <p className="text-gray-600 text-lg mb-8 leading-relaxed">
                      {facility.description}
                    </p>

                    <div className="space-y-4">
                      {facility.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex items-center">
                          <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Capabilities Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {capabilities.map((capability, index) => (
            <div
              key={index}
              className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow duration-300 text-center"
            >
              <div className="bg-yellow-100 p-4 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <capability.icon className="h-8 w-8 text-yellow-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {capability.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {capability.description}
              </p>
            </div>
          ))}
        </div>

        {/* Statistics */}
        <div className="bg-yellow-600 rounded-2xl p-8 md:p-12 text-black">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">5,000</div>
              <div className="text-yellow-800 text-lg">Square Meters</div>
              <div className="text-yellow-900 text-sm mt-1">Modern facility space</div>
            </div>

            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">24/7</div>
              <div className="text-yellow-800 text-lg">Operations</div>
              <div className="text-yellow-900 text-sm mt-1">Continuous production</div>
            </div>

            <div>
              <div className="text-4xl md:text-5xl font-bold mb-2">ISO</div>
              <div className="text-yellow-800 text-lg">Certified</div>
              <div className="text-yellow-900 text-sm mt-1">Quality standards</div>
            </div>
          </div>

          <div className="text-center mt-12">
            <h3 className="text-2xl font-bold mb-4">
              Experience Our World-Class Facility
            </h3>
            <p className="text-yellow-900 mb-6 max-w-2xl mx-auto">
              Schedule a virtual tour or visit our facility to see how we maintain
              the highest standards in FANUC parts and services.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-black text-yellow-400 hover:bg-gray-800 px-8 py-3 rounded-lg font-semibold transition-colors duration-300"
              >
                Schedule Tour
              </a>
              <a
                href="/about"
                className="border-2 border-black text-black hover:bg-black hover:text-yellow-400 px-8 py-3 rounded-lg font-semibold transition-colors duration-300"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default WorkshopSection;
