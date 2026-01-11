'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/ui/logo';
import { useAuthStore } from '@/store/auth-store';
import { cn } from '@/lib/utils';
import { Menu, X, User, LogOut, LayoutDashboard, Settings } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/events', label: 'Events' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Logo href="/" size="md" showText className="hidden sm:flex" />
        <Logo href="/" size="md" showText={false} className="sm:hidden" />

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-sm font-medium transition-colors hover:text-primary',
                pathname === link.href ? 'text-primary' : 'text-muted-foreground'
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <Link href={user?.role === 'ORGANIZER' ? '/dashboard' : '/tickets'}>
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  {user?.role === 'ORGANIZER' ? 'Dashboard' : 'My Tickets'}
                </Button>
              </Link>
              <div className="relative group">
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="w-4 h-4" />
                  {user?.firstName || 'Account'}
                </Button>
                <div className="absolute right-0 top-full mt-2 w-48 py-2 bg-card rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                  <Link href={user?.role === 'ORGANIZER' ? '/settings' : '/account'} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted">
                    <Settings className="w-4 h-4" />
                    Settings
                  </Link>
                  <button onClick={logout} className="flex items-center gap-2 px-4 py-2 text-sm hover:bg-muted w-full text-left text-destructive">
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm">Sign up</Button>
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden p-2" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className="text-sm font-medium" onClick={() => setMobileMenuOpen(false)}>
                {link.label}
              </Link>
            ))}
            <hr />
            {isAuthenticated ? (
              <>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5" />
                  <span className="font-medium">{user?.firstName || 'Account'}</span>
                </div>

                <Link href={user?.role === 'ORGANIZER' ? '/dashboard' : '/tickets'} onClick={() => setMobileMenuOpen(false)}>
                  {user?.role === 'ORGANIZER' ? 'Dashboard' : 'My Tickets'}
                </Link>

                <Link href={user?.role === 'ORGANIZER' ? '/settings' : '/account'} onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>

                <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="text-left text-destructive">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>Log in</Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full">Sign up</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
