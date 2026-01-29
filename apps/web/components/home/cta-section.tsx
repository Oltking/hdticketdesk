'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Shield, Zap, Globe } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-10 md:py-16 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-purple-600 to-pink-600" />
      
      {/* Decorative elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-black/10 rounded-full blur-3xl" />
      </div>
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      
      <div className="container relative">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-white/20 backdrop-blur border border-white/20 mb-5 md:mb-6">
            <Sparkles className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
            <span className="text-[11px] md:text-sm font-medium text-white">Start hosting events today</span>
          </div>
          
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-white mb-4 md:mb-5 leading-tight">
            Ready to Create Your <span className="text-yellow-300">Next Big Event?</span>
          </h2>
          
          <p className="text-sm sm:text-base md:text-lg text-white/80 mb-6 md:mb-7 max-w-xl mx-auto leading-relaxed">
            Join thousands of organizers who trust HDTicketDesk to power their events. Easy setup, secure payments, and instant payouts.
          </p>
          
          {/* Features */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-7 md:mb-8">
            <div className="flex items-center gap-2 text-white/90">
              <Shield className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-[11px] md:text-sm">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Zap className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-[11px] md:text-sm">Instant Payouts</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Globe className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-[11px] md:text-sm">Africa-Wide</span>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4">
            <Link href="/signup?role=organizer">
              <Button size="lg" variant="secondary" className="rounded-full px-7 md:px-8 py-5 md:py-6 text-sm md:text-base text-primary font-semibold group">
                Create Free Account
                <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4 ml-1.5 md:ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="ghost" className="rounded-full px-7 md:px-8 py-5 md:py-6 text-sm md:text-base text-white hover:bg-white/10 border border-white/20">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
