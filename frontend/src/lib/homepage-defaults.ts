// Shared homepage defaults used by both public rendering and the admin editor.
// This avoids the admin page starting from an empty state when DB has no rows yet.

export type HeroCTA = { text: string; href: string };
export type HeroSlide = {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  cta: { primary: HeroCTA; secondary: HeroCTA };
};

export type HeroSectionData = {
  autoPlayMs?: number;
  slides: HeroSlide[];
};

export const DEFAULT_HERO_DATA: HeroSectionData = {
  autoPlayMs: 6000,
  slides: [
    {
      id: 1,
      title: 'Vcocnc - One-Stop CNC Solution Supplier',
      subtitle: 'Your Trusted Partner Since 2005',
      description:
        'Founded in 2005 in Kunshan, Vcocnc supplies bench-tested CNC servo drives, spindle amplifiers, motors, power supplies and multi-brand replacement components for urgent production recovery.',
      image: 'https://s2.loli.net/2025/08/26/Vo4JfbtW5H2GMEN.png',
      cta: {
        primary: { text: 'Browse Products', href: '/products' },
        secondary: { text: 'Learn More', href: '/about' },
      },
    },
    {
      id: 2,
      title: '5,000 sqm Inspection & Drive Center',
      subtitle: 'CNC Drive & Power Replacement Specialist',
      description:
        'Our 46 specialists—including 32 technical and warehouse staff and 14 sales engineers—manage 150,000+ stocked parts and dispatch 80-120 tracked international shipments daily.',
      image: 'https://s2.loli.net/2025/08/26/17MRNhXEcrKTdDY.png',
      cta: {
        primary: { text: 'View Facility', href: '/about' },
        secondary: { text: 'Contact Us', href: '/contact' },
      },
    },
    {
      id: 3,
      title: '20+ Years Professional Service',
      subtitle: 'Sales, Testing & Maintenance',
      description:
        'With more than 20 years of experience, our sales and technical teams coordinate part-number checks, sourcing, testing, repair evaluation and international shipping as one service.',
      image: 'https://s2.loli.net/2025/08/26/17MRNhXEcrKTdDY.png',
      cta: {
        primary: { text: 'Get Support', href: '/contact' },
        secondary: { text: 'Browse Products', href: '/products' },
      },
    },
  ],
};

export type CompanyStatItem = {
  id: number;
  icon: string;
  value: number;
  suffix: string;
  label: string;
  description: string;
  color: string;
};

export type CompanyStatsData = {
  headerTitle: string;
  headerDescription: string;
  stats: CompanyStatItem[];
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimary: HeroCTA;
  ctaSecondary: HeroCTA;
};

export const DEFAULT_COMPANY_STATS_DATA: CompanyStatsData = {
  headerTitle: 'Vcocnc - One-Stop CNC Solution Supplier',
  headerDescription:
    'We supply system units, circuit boards, PLCs, HMIs, inverters, encoders, amplifiers, servo motors and servo drives from AB, ABB, FANUC, Mitsubishi, Siemens and other manufacturers, all handled in our own 5,000 sqm workshop.',
  stats: [
    {
      id: 1,
      icon: 'calendar',
      value: 20,
      suffix: '+',
      label: 'Years Experience',
      description: 'Established in 2005 in Kunshan, China',
      color: 'text-yellow-600',
    },
    {
      id: 2,
      icon: 'building',
      value: 5000,
      suffix: 'sqm',
      label: 'Workshop Facility',
      description: 'Modern infrastructure for quality service',
      color: 'text-yellow-600',
    },
    {
      id: 3,
      icon: 'users',
      value: 46,
      suffix: '',
      label: 'Team Specialists',
      description: '32 technical & warehouse staff and 14 sales engineers',
      color: 'text-yellow-600',
    },
    {
      id: 4,
      icon: 'shield',
      value: 12,
      suffix: ' mo',
      label: 'Warranty Coverage',
      description: 'Standard 12-month warranty on tested replacement parts',
      color: 'text-yellow-600',
    },
    {
      id: 5,
      icon: 'cog',
      value: 150000,
      suffix: '+',
      label: 'Items in Stock',
      description: '150,000+ industrial & CNC spare parts stocked',
      color: 'text-yellow-600',
    },
    {
      id: 6,
      icon: 'truck',
      value: 120,
      suffix: '',
      label: 'Daily Parcels',
      description: '80-120 tracked parcels dispatched daily worldwide',
      color: 'text-yellow-600',
    },
    {
      id: 7,
      icon: 'globe',
      value: 80,
      suffix: '+',
      label: 'Countries Served',
      description: 'Express DHL, FedEx & UPS delivery across 80+ countries',
      color: 'text-yellow-600',
    },
    {
      id: 8,
      icon: 'clock',
      value: 365,
      suffix: ' days',
      label: 'Professional Service',
      description: 'Sales, testing and maintenance',
      color: 'text-yellow-600',
    },
  ],
  ctaTitle: 'Ready to Experience Professional Service?',
  ctaDescription:
    'We have a professional team to provide services including sales, testing and maintenance. Join thousands of satisfied customers worldwide.',
  ctaPrimary: { text: 'Contact Our Experts', href: '/contact' },
  ctaSecondary: { text: 'Browse Products', href: '/products' },
};

export type WorkshopFacilityItem = {
  id: number;
  icon: string;
  title: string;
  description: string;
  image: string;
  features: string[];
};

export type WorkshopCapabilityItem = {
  icon: string;
  title: string;
  description: string;
};

export type WorkshopStatsBlock = {
  items: Array<{ value: string; title: string; subtitle: string }>;
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimary: HeroCTA;
  ctaSecondary: HeroCTA;
};

export type WorkshopSectionData = {
  headerTitle: string;
  headerDescription: string;
  facilities: WorkshopFacilityItem[];
  capabilities: WorkshopCapabilityItem[];
  statsBlock: WorkshopStatsBlock;
};

export const DEFAULT_WORKSHOP_SECTION_DATA: WorkshopSectionData = {
  headerTitle: '5,000 sqm Modern Workshop Facility',
  headerDescription:
    'Our state-of-the-art facility combines advanced technology with expert craftsmanship to deliver exceptional FANUC parts and services.',
  facilities: [
    {
      id: 1,
      icon: 'beaker',
      title: 'Testing & Quality Control',
      description:
        'State-of-the-art testing equipment ensures all parts meet FANUC specifications and industry standards.',
      image: 'https://s2.loli.net/2025/09/01/ZxuFKAvIM3zUHj4.jpg',
      features: [
        'Automated testing systems',
        'Quality certification process',
        'Performance validation',
        'Compliance verification',
      ],
    },
    {
      id: 2,
      icon: 'archive',
      title: 'Organized Storage',
      description:
        'Climate-controlled warehouse with systematic inventory management for optimal part preservation.',
      image: 'https://s2.loli.net/2025/09/01/pxWRrVkNlO8Ugm4.jpg',
      features: [
        'Climate-controlled environment',
        'Systematic organization',
        'Real-time inventory tracking',
        'Secure storage protocols',
      ],
    },
    {
      id: 3,
      icon: 'wrench',
      title: 'Repair & Refurbishment',
      description:
        'Professional repair services with original FANUC parts and certified procedures.',
      image: 'https://s2.loli.net/2025/09/01/wMHu93Fv5egJ6pn.jpg',
      features: [
        'Certified technicians',
        'Original FANUC procedures',
        'Advanced diagnostic tools',
        'Quality assurance testing',
      ],
    },
    {
      id: 4,
      icon: 'shield',
      title: 'Secure Packaging',
      description:
        'Professional packaging ensures safe delivery of sensitive electronic components worldwide.',
      image: 'https://s2.loli.net/2025/09/01/3Rli1zNOEm5sA4T.jpg',
      features: [
        'Anti-static packaging',
        'Shock-resistant materials',
        'Custom protective solutions',
        'International shipping standards',
      ],
    },
  ],
  capabilities: [
    { icon: 'cog', title: 'Advanced Manufacturing', description: 'Precision manufacturing with cutting-edge technology' },
    { icon: 'clipboard', title: 'Quality Assurance', description: 'Rigorous testing and certification processes' },
    { icon: 'truck', title: 'Global Logistics', description: 'Worldwide shipping and distribution network' },
    { icon: 'check', title: 'Documented Inspection', description: 'Bench-tested incoming and pre-shipment quality control' },
  ],
  statsBlock: {
    items: [
      { value: '5,000', title: 'Square Meters', subtitle: 'Modern facility space' },
      { value: '1-2d', title: 'Fast Dispatch', subtitle: 'In-stock handling time' },
      { value: '12 mo', title: 'Warranty', subtitle: 'Tested spare parts' },
    ],
    ctaTitle: 'Experience Our World-Class Facility',
    ctaDescription:
      'Schedule a virtual tour or visit our facility to see how we maintain the highest standards in FANUC parts and services.',
    ctaPrimary: { text: 'Schedule Tour', href: '/contact' },
    ctaSecondary: { text: 'Learn More', href: '/about' },
  },
};

export type ServiceItem = {
  id: number;
  icon: string;
  title: string;
  description: string;
  features: string[];
  color: string;
  href?: string;
};

export type ProcessStep = { step: string; title: string; description: string };

export type ServicesSectionData = {
  headerTitle: string;
  headerDescription: string;
  services: ServiceItem[];
  processTitle: string;
  processDescription: string;
  processSteps: ProcessStep[];
  ctaTitle: string;
  ctaDescription: string;
  ctaPrimary: HeroCTA;
  ctaSecondary: HeroCTA;
  ctaBadges: string[];
};

export const DEFAULT_SERVICES_SECTION_DATA: ServicesSectionData = {
  headerTitle: 'Comprehensive FANUC Services',
  headerDescription:
    'From parts supply to technical support, we provide end-to-end solutions for all your FANUC industrial automation requirements.',
  services: [
    {
      id: 1,
      icon: 'cog',
      title: 'FANUC Parts Supply',
      description:
        'Comprehensive inventory of genuine FANUC parts including servo motors, drives, encoders, and control systems.',
      features: ['Genuine FANUC parts', 'Fast delivery', 'Competitive pricing', 'Quality guarantee'],
      color: 'bg-yellow-500',
      href: '/contact',
    },
    {
      id: 2,
      icon: 'wrench',
      title: 'Repair Services',
      description:
        'Professional repair and refurbishment services for all FANUC components with certified technicians.',
      features: ['Expert technicians', 'Original procedures', 'Quality testing', 'Warranty included'],
      color: 'bg-green-500',
      href: '/contact',
    },
    {
      id: 3,
      icon: 'phone',
      title: 'Technical Support',
      description:
        'Responsive technical assistance from experienced CNC specialists for part verification and drive replacement guidance.',
      features: ['Responsive support', 'Experienced specialists', 'Part-number verification', 'Quick response'],
      color: 'bg-purple-500',
      href: '/contact',
    },
    {
      id: 4,
      icon: 'truck',
      title: 'Global Shipping',
      description:
        'Worldwide shipping and logistics services ensuring safe delivery of sensitive electronic components.',
      features: ['Global coverage', 'Secure packaging', 'Express delivery', 'Tracking included'],
      color: 'bg-orange-500',
      href: '/contact',
    },
    {
      id: 5,
      icon: 'shield',
      title: 'Quality Assurance',
      description:
        'Rigorous testing and quality control processes ensuring all parts meet FANUC specifications.',
      features: ['Documented inspection', 'Functional bench testing', 'Quality records', 'Pre-shipment checks'],
      color: 'bg-red-500',
      href: '/contact',
    },
    {
      id: 6,
      icon: 'cap',
      title: 'Training & Education',
      description:
        'Professional training programs for FANUC systems operation, maintenance, and troubleshooting.',
      features: ['Certified instructors', 'Hands-on training', 'Custom programs', 'Certification available'],
      color: 'bg-indigo-500',
      href: '/contact',
    },
  ],
  processTitle: 'Our Service Process',
  processDescription:
    'We follow a systematic approach to ensure the best outcomes for your FANUC automation projects.',
  processSteps: [
    {
      step: '01',
      title: 'Consultation',
      description:
        'We analyze your requirements and provide expert recommendations for your FANUC automation needs.',
    },
    {
      step: '02',
      title: 'Solution Design',
      description:
        'Our engineers design customized solutions tailored to your specific industrial applications.',
    },
    {
      step: '03',
      title: 'Implementation',
      description:
        'Professional installation and integration services ensuring optimal system performance.',
    },
    {
      step: '04',
      title: 'Support',
      description:
        'Ongoing technical support and maintenance services to keep your systems running smoothly.',
    },
  ],
  ctaTitle: 'Ready to Get Started?',
  ctaDescription:
    'Contact our experts today to discuss your FANUC automation needs and discover how we can help optimize your industrial processes.',
  ctaPrimary: { text: 'Contact Us Today', href: '/contact' },
  ctaSecondary: { text: 'Browse Products', href: '/products' },
  ctaBadges: ['Responsive Technical Support', 'Worldwide Express Dispatch', 'Bench-Tested Quality'],
};

export type FeaturedProductsSectionData = {
  headerTitle: string;
  headerDescription: string;
  ctaText: string;
  ctaHref: string;
};

export const DEFAULT_FEATURED_PRODUCTS_SECTION_DATA: FeaturedProductsSectionData = {
  headerTitle: 'Featured FANUC Products',
  headerDescription:
    'Discover our most popular and high-quality FANUC parts, carefully selected for their reliability and performance in industrial automation applications.',
  ctaText: 'View All Products',
  ctaHref: '/products',
};

export function getDefaultDataBySectionKey(key: string): any | null {
  if (key === 'hero_section') return DEFAULT_HERO_DATA;
  if (key === 'company_stats') return DEFAULT_COMPANY_STATS_DATA;
  if (key === 'workshop_section') return DEFAULT_WORKSHOP_SECTION_DATA;
  if (key === 'services_section') return DEFAULT_SERVICES_SECTION_DATA;
  if (key === 'featured_products') return DEFAULT_FEATURED_PRODUCTS_SECTION_DATA;
  return null;
}
