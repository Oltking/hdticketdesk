'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Ticket, Calendar, Users, ArrowRight, Sparkles, Check } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function RoleSelectionClient() {
  const router = useRouter();
  const { setUser, setAuthenticated } = useAuthStore();
  const { success, error: showError } = useToast();
  const [selectedRole, setSelectedRole] = useState<'BUYER' | 'ORGANIZER' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRoleSelect = async () => {
    if (!selectedRole) {
      showError('Please select a role to continue');
      return;
    }

    setIsSubmitting(true);

    try {
      // Call API to update user role
      const result = await api.updateUserRole(selectedRole);
      
      if (selectedRole === 'ORGANIZER') {
        // Organizer needs to set up their profile
        router.replace('/auth/organizer-setup');
      } else {
        // Buyer can go straight to tickets page
        const user = await api.getMe();
        setUser(user);
        setAuthenticated(true);
        success('Welcome to HDTicketDesk!');
        router.replace('/tickets');
      }
    } catch (err: any) {
      console.error('Role selection error:', err);
      showError(err.message || 'Failed to update role. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Logo />
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {/* Welcome message */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Welcome to HDTicketDesk!
            </div>
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
              How will you use HDTicketDesk?
            </h1>
            <p className="text-muted-foreground text-lg">
              This is a new account. Please choose how you'd like to get started.
            </p>
          </div>

          {/* Role options */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Buyer Option */}
            <Card
              className={`relative p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedRole === 'BUYER'
                  ? 'ring-2 ring-primary shadow-lg bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedRole('BUYER')}
            >
              {selectedRole === 'BUYER' && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Ticket className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">I want to buy tickets</h3>
              <p className="text-muted-foreground mb-4">
                Discover amazing events and purchase tickets. Track all your tickets in one place.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Browse & discover events
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Secure ticket purchases
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Digital tickets & QR codes
                </li>
              </ul>
            </Card>

            {/* Organizer Option */}
            <Card
              className={`relative p-6 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                selectedRole === 'ORGANIZER'
                  ? 'ring-2 ring-primary shadow-lg bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedRole('ORGANIZER')}
            >
              {selectedRole === 'ORGANIZER' && (
                <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-4 h-4 text-white" />
                </div>
              )}
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-4">
                <Calendar className="w-7 h-7 text-purple-500" />
              </div>
              <h3 className="text-xl font-semibold mb-2">I want to host events</h3>
              <p className="text-muted-foreground mb-4">
                Create and manage your own events. Sell tickets and grow your audience.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Create unlimited events
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Sell tickets & receive payouts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Analytics & attendee management
                </li>
              </ul>
            </Card>
          </div>

          {/* Continue button */}
          <div className="flex justify-center">
            <Button
              size="lg"
              className="px-10 py-6 text-lg rounded-full"
              onClick={handleRoleSelect}
              disabled={!selectedRole || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Setting up...
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>

          {/* Note */}
          <p className="text-center text-sm text-muted-foreground mt-6">
            For now, an organizer can not buy tickets!
          </p>
        </div>
      </main>
    </div>
  );
}
