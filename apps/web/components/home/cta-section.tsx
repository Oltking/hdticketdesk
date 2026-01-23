'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Sparkles, Shield, Zap, Globe } from 'lucide-react';

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur border border-white/20 mb-8">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Start hosting events today</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-display font-bold text-white mb-6">
            Ready to Create Your 
            <br />
            <span className="text-yellow-300">Next Big Event?</span>
          </h2>
          
          <p className="text-lg text-white/80 mb-10 max-w-xl mx-auto">
            Join thousands of organizers who trust HDTicketDesk to power their events. 
            Easy setup, secure payments, and instant payouts.
          </p>
          
          {/* Features */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-10">
            <div className="flex items-center gap-2 text-white/90">
              <Shield className="w-5 h-5" />
              <span className="text-sm">Secure Payments</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Zap className="w-5 h-5" />
              <span className="text-sm">Instant Payouts</span>
            </div>
            <div className="flex items-center gap-2 text-white/90">
              <Globe className="w-5 h-5" />
              <span className="text-sm">Africa-Wide</span>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/signup?role=organizer">
              <Button size="lg" variant="secondary" className="rounded-full px-8 text-primary font-semibold group">
                Create Free Account
                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="ghost" className="rounded-full px-8 text-white hover:bg-white/10 border border-white/20">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
