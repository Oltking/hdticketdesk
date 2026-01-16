'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, AlertCircle } from 'lucide-react';

const schema = z.object({
  organizationName: z
    .string()
    .min(1, 'Organization name is required')
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name must be less than 100 characters'),
});

type FormData = z.infer<typeof schema>;

interface OrganizationNameDialogProps {
  open: boolean;
  onSuccess?: () => void;
}

export function OrganizationNameDialog({ open, onSuccess }: OrganizationNameDialogProps) {
  const { setUser } = useAuthStore();
  const { success, error: showError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      setIsSubmitting(true);
      const result = await api.updateOrganizerProfile({ title: data.organizationName });
      
      // Update the user in the auth store
      if (result) {
        const updatedUser = await api.getMe();
        if (updatedUser) {
          setUser(updatedUser);
        }
      }

      success('Organization name saved successfully!');
      onSuccess?.();
    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to save organization name. Please try again.';
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Building2 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <DialogTitle>Set Your Organization Name</DialogTitle>
              <DialogDescription>
                Required to create events
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium">Organization name is required</p>
            <p className="text-amber-700 mt-0.5">
              You need to set your organization name before you can create events. This will be displayed on your events and tickets.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="organizationName">
              Organization Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="organizationName"
              placeholder="Your company or brand name"
              {...register('organizationName')}
              className={errors.organizationName ? 'border-red-500' : ''}
              autoFocus
            />
            {errors.organizationName ? (
              <p className="text-xs text-red-500">{errors.organizationName.message}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                This will be displayed on your events and tickets
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Organization Name'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Hook to check if organization name is needed
export function useOrganizationNameCheck(user: any) {
  const needsOrganizationName = 
    user?.role === 'ORGANIZER' && 
    user?.organizerProfile && 
    (!user.organizerProfile.title || user.organizerProfile.title.trim() === '');
  
  return { needsOrganizationName };
}
