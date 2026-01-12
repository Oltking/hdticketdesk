'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Ticket, RotateCcw, Settings } from 'lucide-react';

const buyerNavItems = [
  { href: '/tickets', label: 'My Tickets', icon: Ticket },
  { href: '/refunds', label: 'Refunds', icon: RotateCcw },
  { href: '/account', label: 'Settings', icon: Settings },
];

function BuyerNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 mb-8 p-1 bg-muted/50 rounded-lg w-fit">
      {buyerNavItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AccountPage() {
  const { user, isLoading: authLoading } = useAuth(true);
  const { success, error } = useToast();
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState('');

  const profileForm = useForm();
  const bankForm = useForm();

  useEffect(() => {
    if (user) {
      profileForm.reset({ firstName: user.firstName, lastName: user.lastName, phone: user.phone });
      if (user.role === 'ORGANIZER' && user.organizerProfile) {
        bankForm.reset({
          bankCode: user.organizerProfile.bankCode,
          accountNumber: user.organizerProfile.accountNumber,
          accountName: user.organizerProfile.accountName,
        });
        setSelectedBank(user.organizerProfile.bankCode || '');
      }
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'ORGANIZER') {
      const fetchBanks = async () => {
        try {
          const data = await api.getBanks();
          setBanks(data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchBanks();
    }
  }, [user]);

  const onProfileSubmit = async (data: any) => {
    try {
      await api.updateProfile(data);
      success('Profile updated!');
    } catch (err: any) {
      error(err.message || 'Failed to update');
    }
  };

  const onBankSubmit = async (data: any) => {
    try {
      const bank = banks.find(b => b.code === selectedBank);
      await api.updateOrganizerBank({ ...data, bankName: bank?.name });
      success('Bank details updated!');
    } catch (err: any) {
      error(err.message || 'Failed to update bank details');
    }
  };

  if (authLoading) return null;

  return (
    <>
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold">Account Settings</h1>
        </div>
        
        {user?.role === 'BUYER' && <BuyerNav />}

        {user?.role === 'BUYER' && (
          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Profile Information</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2"><Label>First Name</Label><Input {...profileForm.register('firstName')} /></div>
                <div className="space-y-2"><Label>Last Name</Label><Input {...profileForm.register('lastName')} /></div>
              </div>
              <div className="space-y-2"><Label>Phone</Label><Input {...profileForm.register('phone')} /></div>
              <Button type="submit" loading={profileForm.formState.isSubmitting}>Save Profile</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {user?.role === 'ORGANIZER' && (
        <>
          <Card className="mb-8 max-w-2xl">
            <CardHeader><CardTitle>Organizer Profile</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label>First Name</Label><Input {...profileForm.register('firstName')} /></div>
                  <div className="space-y-2"><Label>Last Name</Label><Input {...profileForm.register('lastName')} /></div>
                </div>
                <div className="space-y-2"><Label>Phone</Label><Input {...profileForm.register('phone')} /></div>
                <div className="space-y-2"><Label>Organizer Title</Label><Input value={user.organizerProfile?.title || ''} disabled /></div>
                <Button type="submit" loading={profileForm.formState.isSubmitting}>Save Profile</Button>
              </form>
            </CardContent>
          </Card>

          <Card className="max-w-2xl">
            <CardHeader><CardTitle>Bank Details</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>
                      {banks.map((bank: any) => (
                        <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2"><Label>Account Number</Label><Input {...bankForm.register('accountNumber')} /></div>
                <div className="space-y-2"><Label>Account Name</Label><Input {...bankForm.register('accountName')} /></div>
                <Button type="submit" loading={bankForm.formState.isSubmitting}>Save Bank Details</Button>
              </form>
            </CardContent>
          </Card>
        </>
      )}
      </main>
      <Footer />
    </>
  );
}
