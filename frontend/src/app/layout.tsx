import type { Metadata } from "next";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/react-query";
import { Toaster } from "react-hot-toast";
import Clarity from "@/components/analytics/Clarity";
import { getSiteUrl } from "@/lib/url";
import { SITE_NAME } from "@/lib/seo";

const SITE_DESCRIPTION =
  "Source FANUC spare parts, FANUC robot spare parts and CNC machine parts from VIBO CNC. 100,000+ automation components in stock with worldwide shipping.";

export async function generateMetadata(): Promise<Metadata> {
  const siteUrl = getSiteUrl();
  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `FANUC Spare Parts & CNC Machine Parts | ${SITE_NAME}`,
      template: `%s | ${SITE_NAME}`,
    },
    description: SITE_DESCRIPTION,
    keywords: [
      "FANUC parts",
      "FANUC spare parts",
      "FANUC robot spare parts",
      "CNC parts",
      "CNC machine spare parts",
      "industrial automation",
      "servo motors",
      "PCB boards",
      "I/O modules",
      "control units",
      "power supplies",
      "automation components",
      "VIBO CNC",
      "China CNC parts supplier",
      "industrial spare parts",
      "CNC machine parts",
    ].join(", "),
    publisher: SITE_NAME,
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
      siteName: SITE_NAME,
      title: `FANUC Spare Parts & CNC Machine Parts | ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      images: [
        {
          url: "/images/og-image.jpg",
          width: 1200,
          height: 630,
          alt: "VIBO CNC - Industrial Automation Components",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `FANUC Spare Parts & CNC Machine Parts | ${SITE_NAME}`,
      description: SITE_DESCRIPTION,
      images: ["/images/og-image.jpg"],
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico?v=20260629" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png?v=20260629" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png?v=20260629" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260629" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0f766e" />
      </head>
      <body className="antialiased">
        <ReactQueryProvider>
          <Clarity />
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10B981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#EF4444',
                  secondary: '#fff',
                },
              },
            }}
          />
        </ReactQueryProvider>
      </body>
    </html>
  );
}
