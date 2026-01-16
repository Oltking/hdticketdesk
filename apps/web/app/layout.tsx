import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  // Use hardcoded URL for metadataBase to ensure static generation works
  // Environment variable NEXT_PUBLIC_APP_URL can override this in production
  metadataBase: new URL('https://hdticketdesk.com'),
  title: {
    default: 'HDTicketDesk - Africa\'s Premier Event Ticketing Platform',
    template: '%s | HDTicketDesk',
  },
  description: 'Discover and book tickets for the hottest events in Africa. Create, manage, and sell tickets for your events with ease. Secure payments, QR check-in, and instant payouts.',
  keywords: ['events', 'tickets', 'ticketing', 'Africa', 'concerts', 'conferences', 'booking', 'Nigeria', 'Lagos', 'event management', 'online ticketing'],
  authors: [{ name: 'HDTicketDesk' }],
  creator: 'HDTicketDesk',
  publisher: 'HDTicketDesk',
  applicationName: 'HDTicketDesk',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/icon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/manifest.json',
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://hdticketdesk.com',
    siteName: 'HDTicketDesk',
    title: 'HDTicketDesk - Africa\'s Premier Event Ticketing Platform',
    description: 'Discover and book tickets for the hottest events in Africa. Create, manage, and sell tickets for your events with ease.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'HDTicketDesk - Event Ticketing Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HDTicketDesk - Africa\'s Premier Event Ticketing Platform',
    description: 'Discover and book tickets for the hottest events in Africa.',
    images: ['/og-image.png'],
    creator: '@hdticketdesk',
    site: '@hdticketdesk',
  },
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
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Structured data for Google
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'HDTicketDesk',
    url: 'https://hdticketdesk.com',
    logo: 'https://hdticketdesk.com/icon-512.png',
    description: 'Africa\'s Premier Event Ticketing Platform',
    sameAs: [
      'https://twitter.com/hdticketdesk',
      'https://www.facebook.com/hdticketdesk',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      email: 'support@hdticketdesk.com',
    },
  };

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" sizes="32x32" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}