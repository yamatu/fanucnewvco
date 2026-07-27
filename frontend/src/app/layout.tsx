import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Clarity from "@/components/analytics/Clarity";
import { SocialLinksProvider } from "@/components/social/SocialLinksProvider";
import DeferredToaster from "@/components/ui/DeferredToaster";
import { DEFAULT_OG_IMAGE, HOME_DESCRIPTION, HOME_TITLE } from "@/lib/seo";
import {
  getConfiguredSocialURLs,
  type SocialLinksPublicConfig,
} from "@/lib/social-links";
import { getSiteUrl } from "@/lib/url";

const inter = Inter({ subsets: ["latin"] });

async function getSocialLinksConfig(): Promise<SocialLinksPublicConfig | null> {
  try {
    const backendUrl = (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080').replace(/\/$/, '');
    const response = await fetch(`${backendUrl}/api/v1/public/social-links`, {
      next: { revalidate: 300, tags: ['social-links'] },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return null;

    const payload = (await response.json()) as {
      success?: boolean;
      data?: SocialLinksPublicConfig;
    };
    return payload.success && payload.data ? payload.data : null;
  } catch {
    return null;
  }
}

export function generateMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: HOME_TITLE,
      template: "%s | Vcocnc FANUC Parts",
    },
    description: HOME_DESCRIPTION,
    keywords: [
      "FANUC parts",
      "CNC parts",
      "industrial automation",
      "servo motors",
      "PCB boards",
      "I/O modules",
      "control units",
      "power supplies",
      "FANUC repair",
      "automation components",
      "Vcocnc",
      "China FANUC supplier",
      "industrial spare parts",
      "CNC machine parts",
    ].join(", "),
    authors: [{ name: "Vcocnc", url: "https://vcocnc.shop" }],
    creator: "Vcocnc Industrial Automation",
    publisher: "Vcocnc",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Vcocnc FANUC Parts",
      url: siteUrl,
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [DEFAULT_OG_IMAGE.url],
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const socialLinks = await getSocialLinksConfig();
  const siteUrl = getSiteUrl();
  const normalizedSiteUrl = siteUrl.replace(/\/$/, '');
  const socialURLs = getConfiguredSocialURLs(socialLinks);
  const socialIdentitySchema = socialURLs.length > 0
    ? {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${normalizedSiteUrl}/#organization`,
        name: 'Vcocnc',
        url: normalizedSiteUrl,
        sameAs: socialURLs,
      }
    : null;

  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#f59e0b" />
        {socialIdentitySchema && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(socialIdentitySchema).replace(/</g, '\\u003c'),
            }}
          />
        )}
      </head>
      <body className={`${inter.className} antialiased`}>
        <SocialLinksProvider initialConfig={socialLinks}>
          <Clarity />
          {children}
          <DeferredToaster />
        </SocialLinksProvider>
      </body>
    </html>
  );
}
