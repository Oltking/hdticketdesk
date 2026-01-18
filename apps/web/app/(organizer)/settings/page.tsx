'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Building2, User, CreditCard, Settings, CheckCircle2, AlertCircle, RefreshCw, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, isLoading: authLoading, refreshUser } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [verifying, setVerifying] = useState(false);

  const profileForm = useForm();
  const organizationForm = useForm();
  const bankForm = useForm();

  useEffect(() => {
    if (user) {
      profileForm.reset({ firstName: user.firstName, lastName: user.lastName, phone: user.phone });
      if (user.organizerProfile) {
        organizationForm.reset({
          organizationName: user.organizerProfile.title || '',
        });
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
    const fetchBanks = async () => {
      try {
        const data = await api.getBanks();
        setBanks(data);
      } catch {
        // Silent fail - bank list will be empty
      }
    };
    fetchBanks();
  }, []);

  const onProfileSubmit = async (data: any) => {
    try {
      await api.updateProfile(data);
      success('Profile updated!');
    } catch (err: any) {
      error(err.message || 'Failed to update');
    }
  };

  const onOrganizationSubmit = async (data: any) => {
    try {
      if (!data.organizationName || data.organizationName.trim().length < 2) {
        error('Organization name must be at least 2 characters');
        return;
      }
      await api.updateOrganizerProfile({ title: data.organizationName.trim() });
      success('Organization name updated!');
      refreshUser?.();
    } catch (err: any) {
      error(err.message || 'Failed to update organization name');
    }
  };

  const onBankSubmit = async (data: any) => {
    try {
      const bank = banks.find(b => b.code === selectedBank);
      await api.updateBankDetails({ ...data, bankCode: selectedBank, bankName: bank?.name || '' });
      success('Bank details updated!');
    } catch (err: any) {
      error(err.message || 'Failed to update');
    }
  };

  const handleResolveAccount = async () => {
    const accountNumber = bankForm.getValues('accountNumber');
    if (!accountNumber || accountNumber.length < 10) {
      error('Please enter a valid 10-digit account number');
      return;
    }
    if (!selectedBank) {
      error('Please select a bank first');
      return;
    }
    
    setVerifying(true);
    try {
      const result = await api.resolveAccount(accountNumber, selectedBank);
      bankForm.setValue('accountName', result.accountName);
      success('Account verified successfully!');
    } catch (err: any) {
      error(err.message || 'Could not resolve account. Please check the details and try again.');
    } finally {
      setVerifying(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar type="organizer" />
        <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
          <Skeleton className="h-8 w-32 mb-6" />
          <div className="max-w-2xl space-y-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar type="organizer" />
      <main className="flex-1 p-4 pt-20 lg:p-8 lg:pt-8 bg-bg">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and account settings
          </p>
        </div>

        <div className="max-w-2xl space-y-6">
          {/* Organization Name Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Organization</CardTitle>
                  <CardDescription>Your organization name appears on events and tickets</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={organizationForm.handleSubmit(onOrganizationSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input 
                    id="organizationName"
                    placeholder="Your company or brand name"
                    {...organizationForm.register('organizationName')} 
                  />
                  <p className="text-xs text-muted-foreground">This will be displayed on your events and tickets</p>
                </div>
                <Button type="submit" loading={organizationForm.formState.isSubmitting}>
                  Save Organization Name
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Profile Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Personal Profile</CardTitle>
                  <CardDescription>Your personal details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" {...profileForm.register('firstName')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" {...profileForm.register('lastName')} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" {...profileForm.register('phone')} placeholder="Enter your phone number" />
                </div>
                <Button type="submit" loading={profileForm.formState.isSubmitting}>Save Profile</Button>
              </form>
            </CardContent>
          </Card>

          {/* Bank Account Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CreditCard className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle>Bank Account</CardTitle>
                  <CardDescription>Your withdrawal account details</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger><SelectValue placeholder="Select your bank" /></SelectTrigger>
                    <SelectContent>{banks.map(bank => <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <div className="flex gap-2">
                    <Input {...bankForm.register('accountNumber')} maxLength={10} placeholder="Enter 10-digit account number" />
                    <Button type="button" variant="outline" onClick={handleResolveAccount} loading={verifying} disabled={verifying}>
                      {verifying ? 'Verifying...' : 'Verify'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Click verify to confirm your account details</p>
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input {...bankForm.register('accountName')} readOnly className="bg-muted" placeholder="Account name will appear after verification" />
                </div>
                <Button type="submit" loading={bankForm.formState.isSubmitting}>Save Bank Details</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
