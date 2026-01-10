'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';


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
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Account</h1>

      {user?.role === 'BUYER' && (
        <Card>
          <CardHeader><CardTitle>Buyer Profile</CardTitle></CardHeader>
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
          <Card className="mb-8">
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

          <Card>
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
  );
}
