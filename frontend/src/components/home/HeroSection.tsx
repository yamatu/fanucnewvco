'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';


const heroSlides = [
  {
    id: 1,
    title: 'Vcocnc - One-Stop CNC Solution Supplier',
    subtitle: 'Your Trusted Partner Since 2005',
    description: 'Vcocnc established in 2005 in Kunshan, China. We are selling automation components like System unit, Circuit board, PLC, HMI, Inverter, Encoder, Amplifier, Servomotor, Servodrive etc of AB, ABB, Fanuc, Mitsubishi, Siemens and other manufacturers.',
    image: 'https://s2.loli.net/2025/08/26/Vo4JfbtW5H2GMEN.png',
    cta: {
      primary: { text: 'Browse Products', href: '/products' },
      secondary: { text: 'Learn More', href: '/about' }
    }
  },

// Optional: HeroContent type (for future dynamic props)
// type HeroContent = Pick<HomepageContent, 'title' | 'subtitle' | 'description' | 'image_url' | 'button_text' | 'button_url'>;

  {
    id: 2,
    title: '5,000sqm Workshop Facility',
    subtitle: 'Top 3 Fanuc Supplier in China',
    description: 'Especially Fanuc, We are one of the top three suppliers in China. We now have 27 workers, 10 sales and 100,000 items regularly stocked. Daily parcel around 50-100pcs, yearly turnover around 200 million.',
    image: 'https://s2.loli.net/2025/08/26/17MRNhXEcrKTdDY.png',
    cta: {
      primary: { text: 'View Facility', href: '/about' },
      secondary: { text: 'Contact Us', href: '/contact' }
    }
  },
  {
    id: 3,
    title: '20+ Years Professional Service',
    subtitle: 'Sales, Testing & Maintenance',
    description: 'More than 18 years experience we have ability to coordinate specific strengths into a whole, providing clients with solutions that consider various import and export transportation options.',
    image: 'https://s2.loli.net/2025/08/26/17MRNhXEcrKTdDY.png',
    cta: {
      primary: { text: 'Get Support', href: '/contact' },
      secondary: { text: 'View Categories', href: '/categories' }
    }
  }
];

export function HeroSection() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  return (
    <section className="relative w-full h-screen min-h-screen flex items-center justify-center overflow-hidden bg-gray-900">
      {/* Background Images */}
      {heroSlides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <Image
            src={slide.image}
            alt={slide.title}
            fill
            className="object-cover w-full h-full"
            style={{
              objectPosition: 'center center',
              objectFit: 'cover'
            }}
            sizes="100vw"
            priority={index === 0}
            onError={(e) => {
              console.error('Image failed to load:', slide.image);
              // 设置备用图片
              const target = e.currentTarget as HTMLImageElement;
              target.src = 'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&h=1080';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/20 to-black/40" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto bg-white bg-opacity-90 rounded-2xl p-8 md:p-12 shadow-2xl backdrop-blur-sm">
          {heroSlides.map((slide, index) => (
            <div
              key={slide.id}
              className={`transition-all duration-1000 ${
                index === currentSlide
                  ? 'opacity-100 transform translate-y-0'
                  : 'opacity-0 transform translate-y-8'
              }`}
              style={{ display: index === currentSlide ? 'block' : 'none' }}
            >
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-gray-900">
                {slide.title}
              </h1>

              <h2 className="text-xl md:text-2xl lg:text-3xl font-light mb-8 text-yellow-600">
                {slide.subtitle}
              </h2>

              <p className="text-lg md:text-xl mb-12 max-w-3xl mx-auto leading-relaxed text-gray-700">
                {slide.description}
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href={slide.cta.primary.href}
                  className="bg-yellow-500 hover:bg-yellow-600 text-black px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  {slide.cta.primary.text}
                </Link>

                <Link
                  href={slide.cta.secondary.href}
                  className="border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-black px-8 py-4 rounded-lg text-lg font-semibold transition-all duration-300 transform hover:scale-105"
                >
                  {slide.cta.secondary.text}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all duration-300"
        aria-label="Previous slide"
      >
        <ChevronLeftIcon className="h-6 w-6" />
      </button>

      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all duration-300"
        aria-label="Next slide"
      >
        <ChevronRightIcon className="h-6 w-6" />
      </button>

      {/* Slide Indicators */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 flex space-x-3">
        {heroSlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'bg-yellow-400 scale-125'
                : 'bg-yellow-400 bg-opacity-50 hover:bg-opacity-75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

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
