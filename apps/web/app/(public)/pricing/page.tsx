import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Check, Sparkles, Zap, Crown, HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function PricingPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-green-500/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 mb-6">
              <Sparkles className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Simple, Transparent Pricing</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
              Only Pay When You <span className="bg-clip-text text-transparent bg-gradient-to-r from-green-500 via-primary to-purple-500">Earn</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              No monthly fees. No setup costs. We only make money when you do. 
              A simple 5% fee on paid ticket sales.
            </p>
          </div>
        </section>

        {/* Pricing Cards */}
        <section className="py-16 relative">
          <div className="container">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              
              {/* Free Events */}
              <div className="bg-card border rounded-3xl p-8 relative">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center mb-6">
                  <Zap className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">Free Events</h3>
                <div className="mb-4">
                  <span className="text-4xl font-display font-bold">0%</span>
                  <span className="text-muted-foreground ml-2">fee</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                  Host free events without any charges. Perfect for community gatherings and meetups.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Unlimited free events', 'QR code check-in', 'Attendee management', 'Email notifications', 'Basic analytics'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup?role=organizer" className="block">
                  <button className="w-full py-3 px-4 rounded-xl border border-border hover:bg-muted transition-colors font-medium">
                    Get Started
                  </button>
                </Link>
              </div>

              {/* Paid Events - Popular */}
              <div className="bg-card border-2 border-primary rounded-3xl p-8 relative shadow-xl shadow-primary/10">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-white text-sm font-medium rounded-full">
                    Most Popular
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mb-6">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">Paid Events</h3>
                <div className="mb-4">
                  <span className="text-4xl font-display font-bold">5%</span>
                  <span className="text-muted-foreground ml-2">per ticket sold</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                  Sell tickets and monetize your events. Only pay when you make money.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Everything in Free', 'Secure payment processing', 'Multiple ticket tiers', 'Refund management', 'Advanced analytics', 'Fast payouts', 'Priority support'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup?role=organizer" className="block">
                  <button className="w-full py-3 px-4 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors font-medium">
                    Start Selling Tickets
                  </button>
                </Link>
              </div>

              {/* Enterprise */}
              <div className="bg-card border rounded-3xl p-8 relative md:col-span-2 lg:col-span-1">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">Enterprise</h3>
                <div className="mb-4">
                  <span className="text-4xl font-display font-bold">Custom</span>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                  For large organizations with high-volume events and custom requirements.
                </p>
                <ul className="space-y-3 mb-8">
                  {['Everything in Paid', 'Custom pricing', 'Dedicated support', 'API access', 'White-label options', 'Custom integrations', 'SLA guarantee'].map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href="mailto:enterprise@hdticketdesk.com" className="block">
                  <button className="w-full py-3 px-4 rounded-xl border border-border hover:bg-muted transition-colors font-medium">
                    Contact Sales
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Fee Explanation */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-12">
                How Our Pricing Works
              </h2>
              
              <div className="space-y-6">
                <div className="bg-card border rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">You Set the Price</h3>
                      <p className="text-sm text-muted-foreground">
                        Set your ticket prices however you like. Our 5% fee is calculated on the ticket price.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ArrowRight className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Choose Who Pays</h3>
                      <p className="text-sm text-muted-foreground">
                        You decide if you absorb the 5% fee or pass it on to buyers. Either way, it is transparent.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-card border rounded-2xl p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Fast Payouts</h3>
                      <p className="text-sm text-muted-foreground">
                        Your earnings are available for withdrawal 24 hours after your first paid sale. Direct to your bank.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Example Calculation */}
              <div className="mt-12 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 border rounded-2xl p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-primary" />
                  Example Calculation
                </h3>
                <div className="bg-card border rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ticket Price</span>
                    <span className="font-medium">₦10,000</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform Fee (5%)</span>
                    <span className="font-medium">- ₦500</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">You Receive</span>
                      <span className="font-bold text-green-600">₦9,500</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  * Or pass the fee to buyers: They pay ₦10,500, you receive the full ₦10,000
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-12">
                Frequently Asked Questions
              </h2>
              
              <div className="space-y-4">
                {[
                  { q: 'Are there any hidden fees?', a: 'No hidden fees. Just our simple 5% on paid ticket sales. Free events are completely free to host.' },
                  { q: 'When can I withdraw my earnings?', a: 'Earnings from paid ticket sales become available 24 hours after your first sale. You can withdraw directly to your bank account.' },
                  { q: 'What payment methods do you support?', a: 'We support all major payment methods through Paystack including cards, bank transfers, and USSD.' },
                  { q: 'Can I issue refunds?', a: 'Yes, you can enable refunds for your events. When a refund is issued, the platform fee is also refunded.' },
                  { q: 'Is there a limit on ticket sales?', a: 'No limits! Sell as many tickets as you want. Our platform scales with your event.' },
                ].map((faq, i) => (
                  <div key={i} className="bg-card border rounded-xl p-5 hover:border-primary/20 transition-colors">
                    <h3 className="font-semibold mb-2">{faq.q}</h3>
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          
          <div className="container relative z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Ready to Start Selling?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-xl mx-auto">
              Join thousands of event organizers who trust hdticketdesk. Create your first event in minutes.
            </p>
            <Link href="/signup?role=organizer" className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary font-semibold rounded-full hover:bg-white/90 transition-colors">
              Create Free Account
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
