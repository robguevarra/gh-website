import { notFound } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Metadata } from 'next';
import { ArrowLeft, UserCog, AlertCircle, Pencil, Shield, CreditCard, Activity, BookOpen, Receipt, GraduationCap, Link2, MailOpen } from 'lucide-react';
import Link from 'next/link';

// Import our data access layer functions
import { getUserDetail, getUserActivityLog, getUserPurchaseHistory, getUserEnrollments } from '@/lib/supabase/data-access/admin-users';

// Import UI components
import { 
  UserProfileForm, 
  UserMembershipForm, 
  UserCourses, 
  UserActivity, 
  UserSecurityForm, 
  UserAdminTools,
  UserPurchaseHistory,
  UserEnrollments
} from '@/components/admin';
import UserEmailAnalytics from '@/components/admin/user-email-analytics';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export const metadata: Metadata = {
  title: 'User Details | Admin',
  description: 'User details and management page',
};

export default async function UserDetailPage(
  props: {
    params: { id: string }
  }
) {
  // Await params to satisfy Next.js 15 requirements
  const params = await Promise.resolve(props.params);
  const id = params.id;
  
  try {
    // Create Supabase client for additional queries
    const supabase = await createServerSupabaseClient();
    
    // Fetch user details using our data access layer
    const { data: userDetail, error: userError } = await getUserDetail(id);
    
    if (userError || !userDetail) {
      console.error('Error fetching user:', userError);
      notFound();
    }
    
    // userDetail is already the profile with additional data
    // No need to extract from a nested property
    
    // Fetch additional user data in parallel for better performance
    const [activityLogResult, purchaseHistoryResult, enrollmentsResult, coursesResult] = await Promise.all([
      getUserActivityLog(id, { limit: 10 }),
      getUserPurchaseHistory(id, { limit: 10 }),
      getUserEnrollments(id),
      // Fetch available courses for the enrollment tab
      supabase.from('courses').select('id, title, description, slug, published, thumbnail_url').eq('published', true)
    ]);
    
    // Extract activity, purchases, and enrollments
    const activityLog = activityLogResult.data || [];
    const purchaseHistory = purchaseHistoryResult.data || [];
    const enrollments = enrollmentsResult.data || [];
    
    // Fetch membership tiers for the membership form
    const { data: membershipTiers } = await supabase
      .from('membership_tiers')
      .select('*')
      .order('price_monthly', { ascending: true });

    // Fetch user's current membership
    const { data: membership } = await supabase
      .from('memberships')
      .select('*')
      .eq('user_id', id)
      .maybeSingle();
    
    // Create user profile data structure from the userDetail
    const userProfile = {
      id: id,
      first_name: userDetail.first_name || null,
      last_name: userDetail.last_name || null,
      email: userDetail.email,
      phone: userDetail.phone || null,
      role: userDetail.status || 'user', // Use status as role
    };

    // Define default roles if none are found in the database
    const defaultRoles = [
      { id: '1', name: 'user', description: 'Regular user' },
      { id: '2', name: 'admin', description: 'Administrator' },
      { id: '3', name: 'moderator', description: 'Content moderator' },
    ];

    return (
      <div className="container py-8 space-y-6">
        {/* Header with back button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/admin/users">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
            </Link>
            <h1 className="text-3xl font-bold tracking-tight mt-2">
              <UserCog className="inline-block mr-2 h-8 w-8" />
              User Details
            </h1>
            <p className="text-muted-foreground">
              {userDetail.first_name
                ? `${userDetail.first_name} ${userDetail.last_name || ''}`
                : userDetail.email}
            </p>
          </div>
        </div>

        {/* User management tabs */}
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid grid-cols-8 w-full">
            <TabsTrigger value="profile"><Pencil className="h-4 w-4 mr-2" /> Profile</TabsTrigger>
            <TabsTrigger value="security"><Shield className="h-4 w-4 mr-2" /> Security</TabsTrigger>
            <TabsTrigger value="membership"><CreditCard className="h-4 w-4 mr-2" /> Membership</TabsTrigger>
            <TabsTrigger value="courses"><BookOpen className="h-4 w-4 mr-2" /> Courses</TabsTrigger>
            <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-2" /> Activity</TabsTrigger>
           <TabsTrigger value="email-analytics"><MailOpen className="h-4 w-4 mr-2" /> Email Analytics</TabsTrigger>
            <TabsTrigger value="purchases"><Receipt className="h-4 w-4 mr-2" /> Purchases</TabsTrigger>
            <TabsTrigger value="enrollments"><GraduationCap className="h-4 w-4 mr-2" /> Enrollments</TabsTrigger>
            <TabsTrigger asChild>
              <Link href="/admin/users/reconciliation" className="flex items-center justify-center">
                <Link2 className="h-4 w-4 mr-2" /> Reconcile
              </Link>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-4">
            <UserProfileForm 
              user={userProfile}
              roles={defaultRoles}
            />
          </TabsContent>

          <TabsContent value="membership" className="space-y-4">
            <UserMembershipForm 
              userId={id}
              membership={membership}
              membershipTiers={membershipTiers || []}
            />
          </TabsContent>

          <TabsContent value="purchases" className="space-y-4">
            <UserPurchaseHistory 
              userId={id}
              purchaseHistory={purchaseHistory || []}
            />
          </TabsContent>

          <TabsContent value="enrollments" className="space-y-4">
            <UserEnrollments 
              userId={id}
              userCourses={enrollments || []}
              availableCourses={coursesResult?.data || []}
            />
          </TabsContent>
          
          <TabsContent value="courses" className="space-y-4">
            <UserCourses 
              userId={id}
              userCourses={enrollments.map(enrollment => ({
                ...enrollment,
                course: enrollment.course
              })) || []}
              availableCourses={coursesResult?.data || []}
            />
          </TabsContent>

          <TabsContent value="activity" className="space-y-4">
            <UserActivity 
              userId={id}
              activityLog={activityLog}
            />
          </TabsContent>

          <TabsContent value="email-analytics" className="space-y-4">
            <UserEmailAnalytics userId={id} />
          </TabsContent>

          <TabsContent value="security" className="space-y-4">
            <UserSecurityForm 
              userId={id}
              user={{
                id: id,
                email: userDetail.email,
                last_login_at: userDetail.last_login_at,
                created_at: userDetail.created_at,
                updated_at: userDetail.updated_at,
                login_count: userDetail.login_count
              }}
            />
          </TabsContent>
          
          <TabsContent value="admin" className="space-y-4">
            <UserAdminTools
              userId={id}
              userEmail={userDetail.email}
              userName={`${userDetail.first_name || ''} ${userDetail.last_name || ''}`.trim() || userDetail.email}
              currentStatus={userDetail.status || 'active'}
              currentPermissions={{
                canAccessPremiumContent: userDetail.permissions?.canAccessPremiumContent || false,
                canAccessBetaFeatures: userDetail.permissions?.canAccessBetaFeatures || false,
                canPostComments: userDetail.permissions?.canPostComments || true,
                canSubmitContent: userDetail.permissions?.canSubmitContent || false,
                maxConcurrentLogins: userDetail.permissions?.maxConcurrentLogins || 3,
                customPermissions: userDetail.permissions?.customPermissions || ''
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    );
  } catch (error) {
    console.error('Error loading user detail page:', error);
    
    // Return a more user-friendly error page instead of 404
    return (
      <div className="container py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <Link href="/admin/users">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Users
              </Button>
            </Link>
          </div>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            There was a problem loading the user details. Please try again later or contact support if the issue persists.
          </AlertDescription>
        </Alert>
      </div>
    );
  }
} 