export type HeroCTA = { text: string; href: string };

export type HeroSlide = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: string;
  primaryText: string;
  primaryHref: string;
  secondaryText: string;
  secondaryHref: string;
};

export type HeroEditorData = {
  autoPlayMs: number;
  slides: HeroSlide[];
};

export type CompanyStat = {
  id: string;
  icon: 'calendar' | 'building' | 'users' | 'shield' | 'cog' | 'truck' | 'globe' | 'clock';
  value: number;
  suffix: string;
  label: string;
  description: string;
  color: string;
};

export type CompanyStatsEditorData = {
  headerTitle: string;
  headerDescription: string;
  stats: CompanyStat[];
  ctaTitle: string;
  ctaDescription: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
};

export type FeaturedProductsEditorData = {
  headerTitle: string;
  headerDescription: string;
  ctaText: string;
  ctaHref: string;
};

export type WorkshopFacility = {
  id: string;
  icon: 'beaker' | 'archive' | 'wrench' | 'shield';
  title: string;
  description: string;
  image: string;
  features: string[];
};

export type WorkshopCapability = {
  id: string;
  icon: 'cog' | 'clipboard' | 'truck' | 'check';
  title: string;
  description: string;
};

export type WorkshopEditorData = {
  headerTitle: string;
  headerDescription: string;
  facilities: WorkshopFacility[];
  capabilities: WorkshopCapability[];
  statsItems: Array<{ id: string; value: string; title: string; subtitle: string }>;
  ctaTitle: string;
  ctaDescription: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
};

export type ServiceCard = {
  id: string;
  icon: 'cog' | 'wrench' | 'phone' | 'truck' | 'shield' | 'cap';
  title: string;
  description: string;
  color:
    | 'bg-yellow-500'
    | 'bg-green-500'
    | 'bg-purple-500'
    | 'bg-orange-500'
    | 'bg-red-500'
    | 'bg-indigo-500';
  href: string;
  features: string[];
};

export type ProcessStep = { id: string; step: string; title: string; description: string };

export type ServicesEditorData = {
  headerTitle: string;
  headerDescription: string;
  services: ServiceCard[];
  processTitle: string;
  processDescription: string;
  processSteps: ProcessStep[];
  ctaTitle: string;
  ctaDescription: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;
  badges: Array<{ id: string; text: string }>;
};

export type SimpleSectionEditorData = {
  title: string;
  subtitle: string;
  description: string;
  image_url: string;
  button_text: string;
  button_url: string;
  sort_order: number;
  is_active: boolean;
};

export function newId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}
