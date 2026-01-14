import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import Link from 'next/link';
import { 
  HelpCircle, Search, Ticket, CreditCard, Users, Calendar, 
  QrCode, RefreshCw, Settings, Shield, Mail, MessageCircle,
  ChevronRight, Sparkles, BookOpen, Phone
} from 'lucide-react';

export default function HelpPage() {
  const categories = [
    {
      icon: Ticket,
      title: 'Buying Tickets',
      description: 'How to find and purchase event tickets',
      color: 'from-blue-500 to-cyan-500',
      articles: [
        'How to buy tickets',
        'Payment methods accepted',
        'Finding your tickets after purchase',
        'Ticket delivery and confirmation',
      ],
    },
    {
      icon: Calendar,
      title: 'Creating Events',
      description: 'Guide for event organizers',
      color: 'from-purple-500 to-pink-500',
      articles: [
        'Creating your first event',
        'Setting up ticket tiers',
        'Adding event images and details',
        'Publishing your event',
      ],
    },
    {
      icon: CreditCard,
      title: 'Payments & Payouts',
      description: 'Managing money on hdticketdesk',
      color: 'from-green-500 to-emerald-500',
      articles: [
        'Understanding the 5% fee',
        'When you can withdraw earnings',
        'Setting up bank details',
        'Payment processing times',
      ],
    },
    {
      icon: QrCode,
      title: 'Check-in & Scanning',
      description: 'Managing event entry',
      color: 'from-orange-500 to-amber-500',
      articles: [
        'How QR code check-in works',
        'Using the scanner app',
        'Handling check-in issues',
        'Viewing attendance stats',
      ],
    },
    {
      icon: RefreshCw,
      title: 'Refunds & Cancellations',
      description: 'Policies and procedures',
      color: 'from-red-500 to-pink-500',
      articles: [
        'Requesting a refund',
        'Refund policies for organizers',
        'Event cancellation process',
        'Refund processing times',
      ],
    },
    {
      icon: Settings,
      title: 'Account Settings',
      description: 'Managing your profile',
      color: 'from-gray-500 to-slate-500',
      articles: [
        'Updating your profile',
        'Changing your password',
        'Email notifications',
        'Deleting your account',
      ],
    },
  ];

  const popularQuestions = [
    { q: 'How do I find my tickets after purchase?', a: 'Your tickets are automatically sent to your email and available in the "My Tickets" section when logged in.' },
    { q: 'When can I withdraw my earnings?', a: 'Earnings become available for withdrawal 24 hours after your first paid ticket sale.' },
    { q: 'How does the 5% fee work?', a: 'We charge 5% on paid ticket sales only. Free events have no fees. You can choose to absorb the fee or pass it to buyers.' },
    { q: 'Can I get a refund for my ticket?', a: 'Refund policies are set by event organizers. Check the event page or contact the organizer directly.' },
    { q: 'How do I scan tickets at my event?', a: 'Use the QR scanner in your organizer dashboard. Simply point your camera at the ticket QR code to check in attendees.' },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-cyan-500/5" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">We are here to help</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                Help Center
              </h1>
              <p className="text-lg text-muted-foreground mb-8">
                Find answers to common questions or get in touch with our support team.
              </p>
              
              {/* Search Box */}
              <div className="relative group max-w-xl mx-auto">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-500" />
                <div className="relative flex items-center bg-card rounded-xl border shadow-lg">
                  <Search className="w-5 h-5 text-muted-foreground ml-4" />
                  <input
                    type="text"
                    placeholder="Search for help articles..."
                    className="flex-1 px-4 py-4 bg-transparent outline-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Grid */}
        <section className="py-16">
          <div className="container">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-12">
              Browse by Category
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {categories.map((category, index) => (
                <div 
                  key={index} 
                  className="group bg-card border rounded-2xl p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${category.color} flex items-center justify-center mb-4`}>
                    <category.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-display font-bold text-lg mb-1">{category.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                  <ul className="space-y-2">
                    {category.articles.map((article, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                        <ChevronRight className="w-3 h-3" />
                        {article}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Popular Questions */}
        <section className="py-16 bg-muted/30">
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <HelpCircle className="w-5 h-5 text-primary" />
                <h2 className="text-2xl md:text-3xl font-display font-bold text-center">
                  Popular Questions
                </h2>
              </div>
              <p className="text-center text-muted-foreground mb-12">
                Quick answers to the most common questions
              </p>
              
              <div className="space-y-4">
                {popularQuestions.map((faq, i) => (
                  <div key={i} className="bg-card border rounded-xl p-5 hover:border-primary/20 hover:shadow-md transition-all">
                    <h3 className="font-semibold mb-2 flex items-start gap-2">
                      <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                        Q
                      </span>
                      {faq.q}
                    </h3>
                    <p className="text-sm text-muted-foreground pl-8">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Contact Support */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-center mb-4">
                Still Need Help?
              </h2>
              <p className="text-center text-muted-foreground mb-12">
                Our support team is here to assist you
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                {/* Email Support */}
                <div className="bg-card border rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/20 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-display font-bold mb-2">Email Us</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Get a response within 24 hours
                  </p>
                  <a 
                    href="mailto:support@hdticketdesk.com" 
                    className="text-primary font-medium hover:underline text-sm"
                  >
                    support@hdticketdesk.com
                  </a>
                </div>

                {/* Live Chat */}
                <div className="bg-card border rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/20 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-display font-bold mb-2">Live Chat</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Chat with us in real-time
                  </p>
                  <button className="text-primary font-medium hover:underline text-sm">
                    Start Chat
                  </button>
                </div>

                {/* Documentation */}
                <div className="bg-card border rounded-2xl p-6 text-center hover:shadow-lg hover:border-primary/20 transition-all">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-4">
                    <BookOpen className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="font-display font-bold mb-2">Documentation</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Detailed guides and tutorials
                  </p>
                  <Link href="/about" className="text-primary font-medium hover:underline text-sm">
                    View Docs
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          
          <div className="container relative z-10 text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white mb-4">
              Ready to Get Started?
            </h2>
            <p className="text-white/80 mb-8 max-w-xl mx-auto">
              Create your account and start exploring hdticketdesk today.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link href="/signup" className="inline-flex items-center justify-center px-8 py-3 bg-white text-primary font-semibold rounded-full hover:bg-white/90 transition-colors">
                Sign Up Free
              </Link>
              <Link href="/events" className="inline-flex items-center justify-center px-8 py-3 bg-white/10 text-white font-semibold rounded-full border border-white/20 hover:bg-white/20 transition-colors">
                Browse Events
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
