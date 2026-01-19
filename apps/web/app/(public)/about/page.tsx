import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Ticket, Shield, Zap, BarChart3, CreditCard, QrCode, Users, Globe, Heart, Sparkles } from 'lucide-react';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-24 overflow-hidden">
          {/* Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">Africa&apos;s Premier Event Platform</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-6">
              About <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-purple-500 to-pink-500">hdticketdesk</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              We&apos;re building the future of event ticketing in Africa. Our platform empowers creators, 
              event organizers, and professionals to monetize their time and create unforgettable experiences.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
          <div className="container relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                  <Heart className="w-4 h-4" />
                  Our Mission
                </div>
                <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                  Empowering African Creators
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">
                  To provide the most reliable, secure, and user-friendly ticketing solution for the African market. 
                  We believe every creator deserves world-class tools to bring their vision to life.
                </p>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  From intimate workshops to massive concerts, we handle the technology so you can focus 
                  on what you do best — creating amazing experiences.
                </p>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-3xl blur-2xl" />
                <div className="relative bg-card border rounded-3xl p-8 shadow-xl">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="text-center p-4">
                      <p className="text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">10K+</p>
                      <p className="text-sm text-muted-foreground mt-1">Events Hosted</p>
                    </div>
                    <div className="text-center p-4">
                      <p className="text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">500K+</p>
                      <p className="text-sm text-muted-foreground mt-1">Tickets Sold</p>
                    </div>
                    <div className="text-center p-4">
                      <p className="text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">50K+</p>
                      <p className="text-sm text-muted-foreground mt-1">Happy Users</p>
                    </div>
                    <div className="text-center p-4">
                      <p className="text-4xl font-display font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-500">15+</p>
                      <p className="text-sm text-muted-foreground mt-1">Countries</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-background to-pink-50/50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20" />
          <div className="absolute top-1/2 left-0 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                Features
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful tools designed specifically for African event organizers and creators.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { icon: Ticket, title: 'Easy Event Creation', description: 'Create and manage events in minutes with our intuitive dashboard. Multiple ticket tiers, early bird pricing, and more.', color: 'from-primary to-purple-500' },
                { icon: Shield, title: 'Secure Payments', description: 'Industry-leading security with Monnify integration. Your money is always safe and protected.', color: 'from-green-500 to-emerald-500' },
                { icon: QrCode, title: 'QR Check-in System', description: 'Seamless entry management with QR code scanning. Real-time check-in tracking and attendance analytics.', color: 'from-blue-500 to-cyan-500' },
                { icon: BarChart3, title: 'Real-time Analytics', description: 'Track sales, attendance, and revenue in real-time. Make data-driven decisions for your events.', color: 'from-orange-500 to-amber-500' },
                { icon: CreditCard, title: 'Fast Payouts', description: 'Get your money when you need it. Quick and reliable payouts directly to your bank account.', color: 'from-pink-500 to-rose-500' },
                { icon: Globe, title: 'Africa-First Design', description: 'Built specifically for the African market with local payment methods and currency support.', color: 'from-violet-500 to-purple-500' },
              ].map((feature, index) => (
                <div key={index} className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl blur-xl" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
                  <div className="relative bg-card border rounded-2xl p-6 h-full transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          
          <div className="container relative z-10 text-center">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
              Ready to Create Your Next Event?
            </h2>
            <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
              Join thousands of creators and organizers who trust hdticketdesk for their events.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <a href="/signup?role=organizer" className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary font-semibold rounded-full hover:bg-white/90 transition-colors">
                Get Started Free
              </a>
              <a href="/events" className="inline-flex items-center justify-center px-8 py-3 bg-white/10 text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-colors">
                Browse Events
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
