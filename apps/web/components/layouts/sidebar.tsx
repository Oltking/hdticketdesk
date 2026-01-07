'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, Calendar, Plus, DollarSign, Settings, 
  Users, BarChart3, BookOpen, Ticket 
} from 'lucide-react';

interface SidebarProps {
  type: 'organizer' | 'admin';
}

export function Sidebar({ type }: SidebarProps) {
  const pathname = usePathname();

  const organizerLinks = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/events/create', label: 'Create Event', icon: Plus },
    { href: '/payouts', label: 'Payouts', icon: DollarSign },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  const adminLinks = [
    { href: '/admin/overview', label: 'Overview', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Users', icon: Users },
    { href: '/admin/events', label: 'Events', icon: Calendar },
    { href: '/admin/ledger', label: 'Ledger', icon: BookOpen },
  ];

  const links = type === 'admin' ? adminLinks : organizerLinks;

  return (
    <aside className="w-64 border-r bg-card hidden lg:block">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2 font-display font-bold text-xl">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Ticket className="w-5 h-5 text-primary-foreground" />
          </div>
          hdticketdesk
        </Link>
      </div>
      
      <nav className="px-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
          
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="w-5 h-5" />
              {link.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
