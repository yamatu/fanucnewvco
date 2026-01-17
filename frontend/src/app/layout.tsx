import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ReactQueryProvider } from "@/lib/react-query";
import { Toaster } from "react-hot-toast";
import Clarity from "@/components/analytics/Clarity";
import { getSiteUrl } from "@/lib/url";

const inter = Inter({ subsets: ["latin"] });

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FANUC Parts & Industrial Automation Components | Vcocnc",
    template: "%s | Vcocnc FANUC Parts"
  },
  description: "Professional FANUC CNC parts supplier since 2005. 100,000+ items in stock, worldwide shipping. Servo motors, PCB boards, I/O modules, control units. Top 3 FANUC supplier in China.",
  keywords: [
    "FANUC parts", "CNC parts", "industrial automation", "servo motors", "PCB boards",
    "I/O modules", "control units", "power supplies", "FANUC repair", "automation components",
    "Vcocnc", "China FANUC supplier", "industrial spare parts", "CNC machine parts"
  ].join(", "),
  authors: [{ name: "Vcocnc", url: "https://vcocnc.com" }],
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
    url: SITE_URL,
    siteName: "Vcocnc FANUC Parts",
    title: "FANUC Parts & Industrial Automation Components | Vcocnc",
    description: "Professional FANUC CNC parts supplier since 2005. 100,000+ items in stock, worldwide shipping. Top 3 FANUC supplier in China.",
    images: [
      {
        url: "/images/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Vcocnc FANUC Parts - Industrial Automation Components",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FANUC Parts & Industrial Automation Components | Vcocnc",
    description: "Professional FANUC CNC parts supplier since 2005. 100,000+ items in stock, worldwide shipping.",
    images: ["/images/og-image.jpg"],
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
        <link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#f59e0b" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Vcocnc",
            "description": "Professional FANUC CNC parts supplier since 2005",
              "url": SITE_URL,
              "logo": {
                "@type": "ImageObject",
                "url": `${SITE_URL}/android-chrome-512x512.png`
              },
              "foundingDate": "2005",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": process.env.NEXT_PUBLIC_COMPANY_STREET || undefined,
                "postalCode": process.env.NEXT_PUBLIC_COMPANY_POSTAL_CODE || undefined,
                "addressLocality": process.env.NEXT_PUBLIC_COMPANY_CITY || "Kunshan",
                "addressRegion": process.env.NEXT_PUBLIC_COMPANY_REGION || "Jiangsu",
                "addressCountry": process.env.NEXT_PUBLIC_COMPANY_COUNTRY_CODE || "CN"
              },
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "sales",
                "email": "sales@vcocnc.com"
              },
              "sameAs": [
                "https://www.linkedin.com/company/vcocnc",
                "https://twitter.com/vcocnc"
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
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
