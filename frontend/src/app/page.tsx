import PublicLayout from '@/components/layout/PublicLayout';
import HeroSection from '@/components/home/HeroSection';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import CompanyStats from '@/components/home/CompanyStats';
import WorkshopSection from '@/components/home/WorkshopSection';
import ServicesSection from '@/components/home/ServicesSection';
import { generateOrganizationSchema, generateWebsiteSchema, generateLocalBusinessSchema } from '@/lib/structured-data';

export default function Home() {
  // Enhanced structured data using the new utility functions
  const organizationSchema = generateOrganizationSchema();
  const websiteSchema = generateWebsiteSchema();
  const localBusinessSchema = generateLocalBusinessSchema();

  const combinedStructuredData = {
    "@context": "https://schema.org",
    "@graph": [
      organizationSchema,
      websiteSchema,
      localBusinessSchema
    ]
  };
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(combinedStructuredData)
        }}
      />
      <PublicLayout>
        <HeroSection />
        <CompanyStats />
        <FeaturedProducts />
        <WorkshopSection />
        <ServicesSection />
      </PublicLayout>
    </>
  );
}
