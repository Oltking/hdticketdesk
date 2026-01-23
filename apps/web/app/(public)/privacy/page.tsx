import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { Shield, Lock, Eye, Database, UserCheck, Mail, FileText, Globe, Bell, Trash2 } from 'lucide-react';

export default function PrivacyPage() {
  const sections = [
    {
      icon: Database,
      title: 'Information We Collect',
      content: [
        'Personal information (name, email address, phone number) when you create an account',
        'Payment information processed securely through Monnify',
        'Event preferences and booking history',
        'Device information and usage data to improve our services',
        'Location data when you search for events near you (with your permission)',
      ],
    },
    {
      icon: Eye,
      title: 'How We Use Your Information',
      content: [
        'To provide and maintain our ticketing services',
        'To process payments and send transaction confirmations',
        'To send event reminders and important updates',
        'To personalize your experience and show relevant events',
        'To improve our platform based on usage patterns',
        'To communicate with you about your account or support requests',
      ],
    },
    {
      icon: UserCheck,
      title: 'Information Sharing',
      content: [
        'With event organizers for events you\'ve purchased tickets to',
        'With payment processors (Monnify) to complete transactions',
        'With service providers who help us operate our platform',
        'When required by law or to protect our legal rights',
        'We never sell your personal information to third parties',
      ],
    },
    {
      icon: Lock,
      title: 'Data Security',
      content: [
        'Industry-standard SSL encryption for all data transmission',
        'Secure payment processing through PCI-compliant Monnify',
        'Regular security audits and vulnerability assessments',
        'Access controls and authentication for all systems',
        'Encrypted storage for sensitive personal information',
      ],
    },
    {
      icon: Bell,
      title: 'Your Rights & Choices',
      content: [
        'Access and download your personal data at any time',
        'Update or correct your account information',
        'Opt out of marketing communications',
        'Request deletion of your account and data',
        'Control cookie preferences through your browser settings',
      ],
    },
    {
      icon: Globe,
      title: 'Cookies & Tracking',
      content: [
        'Essential cookies to keep you logged in and remember preferences',
        'Analytics cookies to understand how you use our platform',
        'You can disable non-essential cookies in your browser settings',
        'We use these insights to improve your experience',
      ],
    },
  ];

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-blue-500/5" />
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          
          <div className="container relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 mb-6">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
                Privacy Policy
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Your privacy is important to us. This policy explains how we collect, use, and protect your information.
              </p>
              <p className="text-sm text-muted-foreground">
                Last updated: January 2025
              </p>
            </div>
          </div>
        </section>

        {/* Quick Summary */}
        <section className="py-12 border-y bg-muted/30">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="grid sm:grid-cols-3 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Secure & Encrypted</h3>
                    <p className="text-xs text-muted-foreground">All data is encrypted in transit and at rest</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Your Control</h3>
                    <p className="text-xs text-muted-foreground">Access, update, or delete your data anytime</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Trash2 className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">No Data Selling</h3>
                    <p className="text-xs text-muted-foreground">We never sell your personal information</p>
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
                    <h2 className="text-xl font-display font-bold mb-2">Contact Us</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      If you have any questions about this Privacy Policy or how we handle your data, 
                      please don&apos;t hesitate to reach out.
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
                  By using HDTicketDesk, you agree to this Privacy Policy. We may update this policy 
                  from time to time, and will notify you of any significant changes.
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
