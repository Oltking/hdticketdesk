import { Suspense } from 'react';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { HeroBanner } from '@/components/home/hero-banner';
import { EventCarousel } from '@/components/home/event-carousel';
import { LiveNowSection } from '@/components/home/live-now-section';
import { TrendingSection } from '@/components/home/trending-section';
import { UpcomingSection } from '@/components/home/upcoming-section';
import { FeaturedSection } from '@/components/home/featured-section';
import { CTASection } from '@/components/home/cta-section';
import { Skeleton } from '@/components/ui/skeleton';

export default function HomePage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section with Floating Event Carousel */}
        <HeroBanner />
        
        {/* Floating Event Cards Carousel */}
        <Suspense fallback={<CarouselSkeleton />}>
          <EventCarousel />
        </Suspense>
        
        {/* Live Now Section */}
        <Suspense fallback={<SectionSkeleton title="Live Now" />}>
          <LiveNowSection />
        </Suspense>
        
        {/* Trending Events */}
        <Suspense fallback={<SectionSkeleton title="Trending" />}>
          <TrendingSection />
        </Suspense>
        
        {/* Upcoming Events */}
        <Suspense fallback={<SectionSkeleton title="Upcoming" />}>
          <UpcomingSection />
        </Suspense>
        
        {/* Featured Events */}
        <Suspense fallback={<SectionSkeleton title="Featured" />}>
          <FeaturedSection />
        </Suspense>
        
        {/* CTA Section */}
        <CTASection />
      </main>
      <Footer />
    </>
  );
}

function CarouselSkeleton() {
  return (
    <div className="py-8 overflow-hidden">
      <div className="flex gap-6 px-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-72 h-48 rounded-2xl flex-shrink-0" />
        ))}
      </div>
    </div>
  );
}

function SectionSkeleton({ title }: { title: string }) {
  return (
    <section className="py-16 container">
      <Skeleton className="h-8 w-48 mb-8" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-72 rounded-2xl" />
        ))}
      </div>
    </section>
  );
}
