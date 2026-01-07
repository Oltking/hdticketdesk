import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="container py-16 max-w-3xl">
        <h1 className="text-4xl font-bold mb-6">About hdticketdesk</h1>
        <div className="prose prose-lg">
          <p className="text-text-muted text-lg mb-6">hdticketdesk is an Africa-first ticketing and paid appointments platform built to help creators, event organizers, and professionals monetize their time and events.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p className="text-text-muted mb-6">To provide the most reliable, secure, and user-friendly ticketing solution for the African market, enabling creators to focus on what they do best while we handle the technology.</p>
          <h2 className="text-2xl font-semibold mt-8 mb-4">Features</h2>
          <ul className="list-disc pl-6 text-text-muted space-y-2">
            <li>Easy event creation and management</li>
            <li>Secure payment processing with Paystack</li>
            <li>QR code-based check-in system</li>
            <li>Real-time analytics and reporting</li>
            <li>Fast and reliable payouts</li>
          </ul>
        </div>
      </main>
      <Footer />
    </>
  );
}
