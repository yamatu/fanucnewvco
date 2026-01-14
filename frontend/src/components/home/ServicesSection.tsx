'use client';

import Link from 'next/link';
import { 
  CogIcon, 
  WrenchScrewdriverIcon, 
  PhoneIcon, 
  TruckIcon,
  ShieldCheckIcon,
  AcademicCapIcon,
  ClockIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';

const services = [
  {
    id: 1,
    icon: CogIcon,
    title: 'FANUC Parts Supply',
    description: 'Comprehensive inventory of genuine FANUC parts including servo motors, drives, encoders, and control systems.',
    features: ['Genuine FANUC parts', 'Fast delivery', 'Competitive pricing', 'Quality guarantee'],
    color: 'bg-yellow-500'
  },
  {
    id: 2,
    icon: WrenchScrewdriverIcon,
    title: 'Repair Services',
    description: 'Professional repair and refurbishment services for all FANUC components with certified technicians.',
    features: ['Expert technicians', 'Original procedures', 'Quality testing', 'Warranty included'],
    color: 'bg-green-500'
  },
  {
    id: 3,
    icon: PhoneIcon,
    title: 'Technical Support',
    description: '24/7 technical assistance from certified FANUC specialists for troubleshooting and guidance.',
    features: ['24/7 availability', 'Certified specialists', 'Remote diagnostics', 'Quick response'],
    color: 'bg-purple-500'
  },
  {
    id: 4,
    icon: TruckIcon,
    title: 'Global Shipping',
    description: 'Worldwide shipping and logistics services ensuring safe delivery of sensitive electronic components.',
    features: ['Global coverage', 'Secure packaging', 'Express delivery', 'Tracking included'],
    color: 'bg-orange-500'
  },
  {
    id: 5,
    icon: ShieldCheckIcon,
    title: 'Quality Assurance',
    description: 'Rigorous testing and quality control processes ensuring all parts meet FANUC specifications.',
    features: ['ISO certified', 'Comprehensive testing', 'Quality documentation', 'Compliance verification'],
    color: 'bg-red-500'
  },
  {
    id: 6,
    icon: AcademicCapIcon,
    title: 'Training & Education',
    description: 'Professional training programs for FANUC systems operation, maintenance, and troubleshooting.',
    features: ['Certified instructors', 'Hands-on training', 'Custom programs', 'Certification available'],
    color: 'bg-indigo-500'
  }
];

const processSteps = [
  {
    step: '01',
    title: 'Consultation',
    description: 'We analyze your requirements and provide expert recommendations for your FANUC automation needs.'
  },
  {
    step: '02',
    title: 'Solution Design',
    description: 'Our engineers design customized solutions tailored to your specific industrial applications.'
  },
  {
    step: '03',
    title: 'Implementation',
    description: 'Professional installation and integration services ensuring optimal system performance.'
  },
  {
    step: '04',
    title: 'Support',
    description: 'Ongoing technical support and maintenance services to keep your systems running smoothly.'
  }
];

export function ServicesSection() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Comprehensive FANUC Services
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            From parts supply to technical support, we provide end-to-end solutions 
            for all your FANUC industrial automation requirements.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden group"
            >
              <div className="p-8">
                <div className={`${service.color} p-4 rounded-full w-16 h-16 mb-6 flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="h-8 w-8 text-white" />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-4">
                  {service.title}
                </h3>

                <p className="text-gray-600 mb-6 leading-relaxed">
                  {service.description}
                </p>

                <ul className="space-y-2 mb-6">
                  {service.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3 flex-shrink-0"></div>
                      {feature}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/contact"
                  className="text-yellow-600 hover:text-yellow-700 font-semibold text-sm flex items-center group-hover:translate-x-2 transition-transform duration-300"
                >
                  Learn More
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Process Section */}
        <div className="bg-gray-50 rounded-2xl p-8 md:p-12">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Our Service Process
            </h3>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We follow a systematic approach to ensure the best outcomes for your FANUC automation projects.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="text-center relative">
                {/* Step Number */}
                <div className="bg-yellow-500 text-black w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>

                {/* Connector Line */}
                {index < processSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-yellow-200 transform translate-x-8"></div>
                )}

                <h4 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h4>

                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl p-8 md:p-12 text-black">
            <div className="max-w-3xl mx-auto">
              <h3 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-yellow-900 mb-8 text-lg">
                Contact our experts today to discuss your FANUC automation needs
                and discover how we can help optimize your industrial processes.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/contact"
                  className="bg-black text-yellow-400 hover:bg-gray-800 px-8 py-4 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center"
                >
                  <PhoneIcon className="h-5 w-5 mr-2" />
                  Contact Us Today
                </Link>

                <Link
                  href="/products"
                  className="border-2 border-black text-black hover:bg-black hover:text-yellow-400 px-8 py-4 rounded-lg font-semibold transition-colors duration-300 flex items-center justify-center"
                >
                  <CogIcon className="h-5 w-5 mr-2" />
                  Browse Products
                </Link>
              </div>

              {/* Contact Info */}
              <div className="flex flex-col md:flex-row justify-center items-center space-y-4 md:space-y-0 md:space-x-8 mt-8 pt-8 border-t border-yellow-700">
                <div className="flex items-center text-yellow-900">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  <span>24/7 Support Available</span>
                </div>

                <div className="flex items-center text-yellow-900">
                  <GlobeAltIcon className="h-5 w-5 mr-2" />
                  <span>Worldwide Service</span>
                </div>

                <div className="flex items-center text-yellow-900">
                  <ShieldCheckIcon className="h-5 w-5 mr-2" />
                  <span>Quality Guaranteed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default ServicesSection;
