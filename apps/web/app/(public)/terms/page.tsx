import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { FileText, Scale, Users, CreditCard, Shield, AlertTriangle, Mail, BookOpen } from 'lucide-react';

export default function TermsPage() {
  const sections = [
    {
      icon: BookOpen,
      title: '1. Acceptance of Terms',
      content: [
        'By accessing or using hdticketdesk, you agree to be bound by these Terms of Service.',
        'If you do not agree to these terms, please do not use our platform.',
        'We reserve the right to update these terms at any time with notice to users.',
        'Continued use after changes constitutes acceptance of the new terms.',
      ],
    },
    {
      icon: Users,
      title: '2. User Accounts',
      content: [
        'You must provide accurate and complete information when creating an account.',
        'You are responsible for maintaining the security of your account credentials.',
        'You must be at least 18 years old to create an organizer account.',
        'One person or entity may not maintain multiple accounts.',
        'We reserve the right to suspend accounts that violate our terms.',
      ],
    },
    {
      icon: FileText,
      title: '3. Event Organizers',
      content: [
        'Organizers are responsible for the accuracy of event information.',
        'Events must comply with all applicable local laws and regulations.',
        'Organizers must honor all tickets sold through our platform.',
        'Prohibited events include those promoting illegal activities, hate speech, or fraud.',
        'We may remove events that violate our community guidelines.',
      ],
    },
    {
      icon: CreditCard,
      title: '4. Payments & Fees',
      content: [
        'A 5% platform fee applies to all paid ticket sales.',
        'Organizers can choose to absorb the fee or pass it to buyers.',
        'Payments are processed securely through Paystack.',
        'Payouts are available 24 hours after the first paid ticket sale.',
        'We are not responsible for payment processing delays by third parties.',
      ],
    },
    {
      icon: Scale,
      title: '5. Refunds & Cancellations',
      content: [
        'Refund policies are set by individual event organizers.',
        'Organizers may enable or disable refunds for their events.',
        'If an event is cancelled, attendees are entitled to a full refund.',
        'Platform fees are refunded when a refund is processed.',
        'Disputes should first be resolved between organizers and attendees.',
      ],
    },
    {
      icon: Shield,
      title: '6. Intellectual Property',
      content: [
        'hdticketdesk and its logo are trademarks of our company.',
        'Event content remains the property of respective organizers.',
        'You may not copy, modify, or distribute our platform without permission.',
        'We respect intellectual property rights and expect users to do the same.',
      ],
    },
    {
      icon: AlertTriangle,
      title: '7. Limitation of Liability',
      content: [
        'hdticketdesk is provided "as is" without warranties of any kind.',
        'We are not liable for event cancellations, changes, or quality.',
        'Our liability is limited to the amount of fees paid to us.',
        'We are not responsible for user-generated content or third-party services.',
        'You agree to indemnify us against claims arising from your use of the platform.',
      ],
    },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-amber-500/5" />
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 mb-6">
                <Scale className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Terms of Service
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Please read these terms carefully before using hdticketdesk.
              </p>
              <p className="text-sm text-muted-foreground">
                Last updated: January 2025
              </p>
            </div>
          </div>
        </section>

        {/* Quick Summary */}
        <section className="py-8 border-y bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">For Everyone</h3>
                    <p className="text-xs text-muted-foreground">Fair terms for organizers and attendees</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Your Protection</h3>
                    <p className="text-xs text-muted-foreground">Clear guidelines and dispute resolution</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <CreditCard className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Transparent Fees</h3>
                    <p className="text-xs text-muted-foreground">Simple 5% fee, no hidden charges</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <section className="py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto space-y-8">
              {sections.map((section, index) => (
                <div key={index} className="group">
                  <div className="bg-card border rounded-2xl p-6 md:p-8 transition-all duration-300 hover:shadow-lg hover:border-primary/20">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-purple-500/10 flex items-center justify-center flex-shrink-0 group-hover:from-primary/20 group-hover:to-purple-500/20 transition-colors">
                        <section.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h2 className="text-xl font-display font-bold mb-4">{section.title}</h2>
                        <ul className="space-y-3">
                          {section.content.map((item, itemIndex) => (
                            <li key={itemIndex} className="flex items-start gap-3 text-muted-foreground">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                              <span className="text-sm leading-relaxed">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Contact Section */}
              <div className="bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 border rounded-2xl p-6 md:p-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-display font-bold mb-2">Questions?</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      If you have any questions about these Terms of Service, please contact our legal team.
                    </p>
                    <a 
                      href="mailto:support@hdticketdesk.com" 
                      className="inline-flex items-center gap-2 text-primary font-medium hover:underline"
                    >
                      <Mail className="w-4 h-4" />
                      support@hdticketdesk.com
                    </a>
                  </div>
                </div>
              </div>

              {/* Footer Note */}
              <div className="text-center pt-8 border-t">
                <p className="text-sm text-muted-foreground">
                  By using hdticketdesk, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
