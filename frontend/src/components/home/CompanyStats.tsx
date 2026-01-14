'use client';

import { useEffect, useState } from 'react';
import ClientOnly from '@/components/common/ClientOnly';
import { 
  CalendarIcon, 
  BuildingOfficeIcon, 
  UsersIcon, 
  GlobeAltIcon,
  CogIcon,
  ShieldCheckIcon,
  TruckIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const stats = [
  {
    id: 1,
    icon: CalendarIcon,
    value: 18,
    suffix: '+',
    label: 'Years Experience',
    description: 'Established in 2005 in Kunshan, China',
    color: 'text-yellow-600'
  },
  {
    id: 2,
    icon: BuildingOfficeIcon,
    value: 5000,
    suffix: 'sqm',
    label: 'Workshop Facility',
    description: 'Modern infrastructure for quality service',
    color: 'text-yellow-600'
  },
  {
    id: 3,
    icon: UsersIcon,
    value: 37,
    suffix: '',
    label: 'Total Employees',
    description: '27 workers and 10 sales professionals',
    color: 'text-yellow-600'
  },
  {
    id: 4,
    icon: ShieldCheckIcon,
    value: 3,
    suffix: '',
    label: 'Top Fanuc Supplier',
    description: 'One of top 3 suppliers in China',
    color: 'text-yellow-600'
  },
  {
    id: 5,
    icon: CogIcon,
    value: 100000,
    suffix: '+',
    label: 'Items in Stock',
    description: 'Comprehensive inventory management',
    color: 'text-yellow-600'
  },
  {
    id: 6,
    icon: TruckIcon,
    value: 100,
    suffix: '',
    label: 'Daily Parcels',
    description: '50-100 parcels shipped daily',
    color: 'text-yellow-600'
  },
  {
    id: 7,
    icon: GlobeAltIcon,
    value: 200,
    suffix: 'M',
    label: 'Yearly Turnover',
    description: 'Annual revenue in millions',
    color: 'text-yellow-600'
  },
  {
    id: 8,
    icon: ClockIcon,
    value: 365,
    suffix: ' days',
    label: 'Professional Service',
    description: 'Sales, testing and maintenance',
    color: 'text-yellow-600'
  }
];

function AnimatedCounter({ value, duration = 2000 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      setCount(Math.floor(progress * value));
      
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  return <span suppressHydrationWarning>{count.toLocaleString()}</span>;
}

export function CompanyStats() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    const element = document.getElementById('company-stats');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  return (
    <section id="company-stats" className="py-20 bg-gradient-to-br from-gray-50 to-yellow-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Vcocnc - One-Stop CNC Solution Supplier
          </h2>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto">
            We are selling automation components like System unit, Circuit board, PLC, HMI, Inverter,
            Encoder, Amplifier, Servomotor, Servodrive etc of AB, ABB, Fanuc, Mitsubishi, Siemens
            and other manufacturers in our own 5,000sqm workshop.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {stats.map((stat, index) => {
            const IconComponent = stat.icon;
            
            return (
              <div
                key={stat.id}
                className={`bg-white rounded-xl p-5 sm:p-6 lg:p-8 shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 sm:hover:-translate-y-2 ${
                  isVisible
                    ? 'opacity-100 translate-y-0'
                    : 'opacity-0 translate-y-4 sm:translate-y-8'
                }`}
                style={{
                  transitionDelay: isVisible ? `${index * 100}ms` : '0ms'
                }}
              >
                <div className="flex items-center justify-center mb-4 sm:mb-6">
                  <div className={`p-3 sm:p-4 rounded-full bg-gray-50 ${stat.color}`}>
                    <IconComponent className="h-6 w-6 sm:h-8 sm:w-8" />
                  </div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
                    <ClientOnly fallback={<span suppressHydrationWarning>0</span>}>
                      {isVisible ? (
                        <AnimatedCounter value={stat.value} />
                      ) : (
                        <span suppressHydrationWarning>0</span>
                      )}
                    </ClientOnly>
                    <span className={`${stat.color} text-base sm:text-lg align-top ml-1`}>{stat.suffix}</span>
                  </div>
                  
                  <h3 className="text-sm sm:text-base font-semibold text-gray-900 mb-1 sm:mb-2 leading-snug">
                    {stat.label}
                  </h3>

                  <p className="text-gray-600 text-xs sm:text-sm leading-relaxed">
                    {stat.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-16">
          <div className="bg-white rounded-2xl p-8 shadow-lg max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to Experience Professional Service?
            </h3>
            <p className="text-gray-600 mb-6">
              We have a professional team to provide services including sales, testing and maintenance.
              Join thousands of satisfied customers worldwide.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="/contact"
                className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-3 rounded-lg font-semibold transition-colors duration-300"
              >
                Contact Our Experts
              </a>
              <a
                href="/categories"
                className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-black px-8 py-3 rounded-lg font-semibold transition-colors duration-300"
              >
                Browse Categories
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default CompanyStats;
