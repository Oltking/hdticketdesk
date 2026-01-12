'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sidebar } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPage() {
  const { user, isLoading: authLoading } = useAuth(true, ['ORGANIZER']);
  const { success, error } = useToast();
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState('');

  const profileForm = useForm();
  const bankForm = useForm();

  useEffect(() => {
    if (user) {
      profileForm.reset({ firstName: user.firstName, lastName: user.lastName, phone: user.phone });
      if (user.organizerProfile) {
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
    if (!accountNumber || !selectedBank) return;
    try {
      const result = await api.resolveAccount(accountNumber, selectedBank);
      bankForm.setValue('accountName', result.accountName);
    } catch {
      error('Could not resolve account');
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
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="max-w-2xl space-y-6">
          <Card>
            <CardHeader><CardTitle>Profile</CardTitle></CardHeader>
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

          <Card>
            <CardHeader><CardTitle>Bank Account</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={bankForm.handleSubmit(onBankSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Select value={selectedBank} onValueChange={setSelectedBank}>
                    <SelectTrigger><SelectValue placeholder="Select bank" /></SelectTrigger>
                    <SelectContent>{banks.map(bank => <SelectItem key={bank.code} value={bank.code}>{bank.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <div className="flex gap-2">
                    <Input {...bankForm.register('accountNumber')} maxLength={10} />
                    <Button type="button" variant="outline" onClick={handleResolveAccount}>Verify</Button>
                  </div>
                </div>
                <div className="space-y-2"><Label>Account Name</Label><Input {...bankForm.register('accountName')} readOnly className="bg-bg" /></div>
                <Button type="submit" loading={bankForm.formState.isSubmitting}>Save Bank Details</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
