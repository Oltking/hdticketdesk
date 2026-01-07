import type { Metadata } from 'next';
import { Providers } from '@/components/providers';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://hdticketdesk.com'),
  title: {
    default: 'hdticketdesk - Africa\'s Premier Event Ticketing Platform',
    template: '%s | hdticketdesk',
  },
  description: 'Discover and book tickets for the hottest events in Africa. Create, manage, and sell tickets for your events with ease. Secure payments, QR check-in, and instant payouts.',
  keywords: ['events', 'tickets', 'ticketing', 'Africa', 'concerts', 'conferences', 'booking', 'Nigeria', 'Lagos'],
  authors: [{ name: 'hdticketdesk' }],
  creator: 'hdticketdesk',
  publisher: 'hdticketdesk',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: 'website',
    locale: 'en_NG',
    url: 'https://hdticketdesk.com',
    siteName: 'hdticketdesk',
    title: 'hdticketdesk - Africa\'s Premier Event Ticketing Platform',
    description: 'Discover and book tickets for the hottest events in Africa.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'hdticketdesk - Event Ticketing',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'hdticketdesk - Africa\'s Premier Event Ticketing Platform',
    description: 'Discover and book tickets for the hottest events in Africa.',
    images: ['/og-image.png'],
    creator: '@hdticketdesk',
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
