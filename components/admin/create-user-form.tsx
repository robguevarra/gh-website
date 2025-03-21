'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

// Form schema validation
const formSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  phone: z.string().optional(),
  role: z.string(),
  create_membership: z.boolean().default(false),
  membership_tier_id: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface MembershipTier {
  id: string;
  name: string;
  description?: string;
  price: number;
  features?: string[];
}

interface CreateUserFormProps {
  roles: Role[];
  membershipTiers: MembershipTier[];
}

export default function CreateUserForm({ roles, membershipTiers }: CreateUserFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      phone: '',
      role: 'user',
      create_membership: false,
      membership_tier_id: '',
    },
  });
  
  // Watch create_membership to conditionally display membership tier selector
  const createMembership = form.watch('create_membership');
  
  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      const supabase = createBrowserSupabaseClient();
      const now = new Date().toISOString();
      
      // 1. Create user auth account
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: values.email,
        password: values.password,
        email_confirm: true, // Auto-confirm email
      });
      
      if (authError) throw authError;
      
      const userId = authData.user.id;
      
      // 2. Create profile data
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          first_name: values.first_name,
          last_name: values.last_name,
          email: values.email,
          phone: values.phone,
          role: values.role,
          created_at: now,
          updated_at: now,
        });
        
      if (profileError) {
        // If profile creation fails, try to clean up auth user
        await supabase.auth.admin.deleteUser(userId);
        throw profileError;
      }
      
      // 3. Create membership if requested
      if (values.create_membership && values.membership_tier_id) {
        const { error: membershipError } = await supabase
          .from('user_memberships')
          .insert({
            user_id: userId,
            membership_tier_id: values.membership_tier_id,
            is_active: true,
            start_date: now,
            created_at: now,
            updated_at: now,
          });
          
        if (membershipError) {
          console.error('Error creating membership:', membershipError);
          // Continue despite membership error, but show warning
          toast({
            title: 'Warning',
            description: 'User created but membership setup failed. Please set up membership manually.',
            variant: 'destructive',
          });
        }
      }
      
      // Show success message
      toast({
        title: 'User created',
        description: 'The user has been created successfully.',
      });
      
      // Redirect to user list
      router.push('/admin/users');
      router.refresh();
    } catch (error) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: 'There was an error creating the user. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="First name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Last name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input placeholder="Email address" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Password" 
                  type="password" 
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Password must be at least 8 characters and include uppercase, lowercase, and numbers.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Role</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.name} value={role.name}>
                      {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormDescription>
                The user role determines what permissions they have.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="space-y-4 rounded-md border p-4">
          <FormField
            control={form.control}
            name="create_membership"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    Create membership for this user
                  </FormLabel>
                  <FormDescription>
                    Automatically set up a membership for this user
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          
          {createMembership && (
            <FormField
              control={form.control}
              name="membership_tier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Membership Tier</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select membership tier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {membershipTiers.map((tier) => (
                        <SelectItem key={tier.id} value={tier.id}>
                          {tier.name} - ${tier.price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Creating User...' : 'Create User'}
        </Button>
      </form>
    </Form>
  );
} 