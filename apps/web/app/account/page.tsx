'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLoader } from '@/components/ui/spinner';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { BuyerNav } from '@/components/layouts/sidebar';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Loader2, User, CreditCard, Building2 } from 'lucide-react';

export default function AccountPage() {
  const { user, isLoading: authLoading } = useAuth(true);
  const { success, error } = useToast();
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  const profileForm = useForm();
  const bankForm = useForm();

  const accountNumber = bankForm.watch('accountNumber');

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
        if (user.organizerProfile.accountName) {
          setVerified(true);
        }
      }
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'ORGANIZER') {
      const fetchBanks = async () => {
        try {
          const data = await api.getBanks();
          setBanks(data);
        } catch {
          // Silent fail - bank list will be empty
        }
      };
      fetchBanks();
    }
  }, [user]);

  // Reset verification when bank or account number changes
  useEffect(() => {
    setVerified(false);
  }, [selectedBank, accountNumber]);

  const onProfileSubmit = async (data: any) => {
    try {
      await api.updateProfile(data);
      success('Profile updated!');
    } catch (err: any) {
      error(err.message || 'Failed to update');
    }
  };

  const handleVerifyAccount = async () => {
    const accNumber = bankForm.getValues('accountNumber');
    if (!selectedBank || !accNumber || accNumber.length < 10) {
      error('Please enter a valid bank and account number');
      return;
    }

    try {
      setVerifying(true);
      const result = await api.verifyBankAccount(selectedBank, accNumber);
      if (result.account_name) {
        bankForm.setValue('accountName', result.account_name);
        setVerified(true);
        success('Account verified!');
      } else {
        error('Could not verify account. Please check details.');
      }
    } catch (err: any) {
      error(err.message || 'Failed to verify account');
    } finally {
      setVerifying(false);
    }
  };

  const onBankSubmit = async (data: any) => {
    if (!verified) {
      error('Please verify your account first');
      return;
    }
    try {
      const bank = banks.find(b => b.code === selectedBank);
      await api.updateOrganizerBank({ ...data, bankCode: selectedBank, bankName: bank?.name });
      success('Bank details updated!');
    } catch (err: any) {
      error(err.message || 'Failed to update bank details');
    }
  };

  if (authLoading) {
    return (
      <>
        <Header />
        <main className="flex-1 container py-8">
          <PageLoader text="Loading account..." />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1 container py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              Account Settings
            </h1>
            <p className="text-muted-foreground text-sm mt-2">
              Manage your profile and account preferences
            </p>
          </div>
        </div>
        
        {user?.role === 'BUYER' && <BuyerNav />}

        {user?.role === 'BUYER' && (
          <Card className="max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <User className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <CardTitle>Profile Information</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Your personal details</p>
                </div>
              </div>
            </CardHeader>
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
          <Card className="mb-6 max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Organizer Profile</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Your organizer account details</p>
                </div>
              </div>
            </CardHeader>
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
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <CreditCard className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <CardTitle>Bank Details</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">Your withdrawal account information</p>
                </div>
              </div>
            </CardHeader>
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
                <div className="space-y-2">
                  <Label>Account Number</Label>
                  <div className="flex gap-2">
                    <Input {...bankForm.register('accountNumber')} placeholder="Enter 10-digit account number" />
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleVerifyAccount}
                      disabled={verifying || !selectedBank || !accountNumber || accountNumber.length < 10}
                    >
                      {verifying ? (
                        <><Loader2 className="h-4 w-4 animate-spin mr-1" />Verifying</>
                      ) : verified ? (
                        <><CheckCircle className="h-4 w-4 mr-1 text-green-500" />Verified</>
                      ) : (
                        'Verify'
                      )}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Account Name</Label>
                  <Input 
                    {...bankForm.register('accountName')} 
                    disabled 
                    placeholder="Will be filled after verification"
                    className={verified ? 'bg-green-50 border-green-200' : ''}
                  />
                  {verified && (
                    <p className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Account verified successfully
                    </p>
                  )}
                </div>
                <Button 
                  type="submit" 
                  loading={bankForm.formState.isSubmitting}
                  disabled={!verified}
                >
                  Save Bank Details
                </Button>
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
