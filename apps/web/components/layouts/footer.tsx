import Link from 'next/link';
import { Twitter, Instagram, Facebook } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export function Footer() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="mb-4">
              <Logo href="/" size="md" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Africa's premier event ticketing platform. Discover, book, and host unforgettable experiences.
            </p>
            <div className="flex gap-4">
              <a href="https://x.com/hdticketdesk" className="text-muted-foreground hover:text-primary transition-colors"><Twitter className="w-5 h-5" /></a>
              <a href="https://instagram.com/hdticketdesk" className="text-muted-foreground hover:text-primary transition-colors"><Instagram className="w-5 h-5" /></a>
              <a href="https://facebook.com/hdticketdesk" className="text-muted-foreground hover:text-primary transition-colors"><Facebook className="w-5 h-5" /></a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold mb-4">Discover</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/events" className="hover:text-primary transition-colors">All Events</Link></li>
              <li><Link href="/events?filter=live" className="hover:text-primary transition-colors">Live Now</Link></li>
              <li><Link href="/events?sort=trending" className="hover:text-primary transition-colors">Trending</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Organizers</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/signup?role=organizer" className="hover:text-primary transition-colors">Create Event</Link></li>
              <li><Link href="/pricing" className="hover:text-primary transition-colors">Pricing</Link></li>
              <li><Link href="/help" className="hover:text-primary transition-colors">Help Center</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} hdticketdesk. All rights reserved.</p>
          <p>Made with ❤️ for Africa</p>
        </div>
      </div>
    </footer>
  );
}
