import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="container py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose prose-lg text-text-muted space-y-6">
          <p>Last updated: January 2025</p>
          <h2 className="text-2xl font-semibold text-text-primary mt-8">Information We Collect</h2>
          <p>We collect information you provide directly, including name, email, and payment information when you create an account or purchase tickets.</p>
          <h2 className="text-2xl font-semibold text-text-primary mt-8">How We Use Your Information</h2>
          <p>We use your information to provide our services, process payments, send event-related communications, and improve our platform.</p>
          <h2 className="text-2xl font-semibold text-text-primary mt-8">Data Security</h2>
          <p>We implement industry-standard security measures to protect your personal information. Payment processing is handled securely through Paystack.</p>
          <h2 className="text-2xl font-semibold text-text-primary mt-8">Contact Us</h2>
          <p>For any privacy-related questions, please contact us at privacy@hdticketdesk.com</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
