'use client';
import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff } from 'lucide-react';

const schema = z.object({
  firstName: z.string().min(1, 'Required'),
  lastName: z.string().min(1, 'Required'),
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Min 8 characters'),
  organizerTitle: z.string().optional(),
});

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOrganizer = searchParams.get('role') === 'organizer';
  const { success, error } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    try {
      const result = await api.register({ ...data, role: isOrganizer ? 'ORGANIZER' : 'BUYER' });
      success('Account created! Please verify your email.');
      router.push(`/verify-email?userId=${result.userId}`);
    } catch (err: any) {
      error(err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/" className="text-2xl font-bold text-primary mb-2 block">hdticketdesk</Link>
          <CardTitle>{isOrganizer ? 'Create Organizer Account' : 'Create Account'}</CardTitle>
          <CardDescription>{isOrganizer ? 'Start selling tickets today' : 'Join hdticketdesk'}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>First Name</Label><Input {...register('firstName')} error={errors.firstName?.message as string} /></div>
              <div className="space-y-2"><Label>Last Name</Label><Input {...register('lastName')} error={errors.lastName?.message as string} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" {...register('email')} error={errors.email?.message as string} /></div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} {...register('password')} error={errors.password?.message as string} />
                <button type="button" className="absolute right-3 top-3 text-text-muted" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {isOrganizer && <div className="space-y-2"><Label>Organization Name</Label><Input {...register('organizerTitle')} /></div>}
            <Button type="submit" className="w-full bg-primary text-white" loading={isSubmitting}>Create Account</Button>
          </form>
          <p className="mt-6 text-center text-sm text-text-muted">
            Already have an account? <Link href="/login" className="text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}