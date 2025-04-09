# Platform Integration - Phase 2-4: Admin Experience & Analytics

## Task Objective
Develop an enhanced admin interface that provides comprehensive enrollment management, student progress tracking, and analytics to monitor engagement and effectiveness of the Papers to Profits course.

## Current State Assessment
Our current admin implementation includes:

### Admin UI
- ✅ `CourseEnrollmentManagement` component in `/components/admin/course-enrollment-management.tsx`:
  - Displays enrollments in a table with status badges
  - Provides filtering by status
  - Offers pagination controls
  - Includes user search for adding enrollments
  - Supports status updates and deletion

### Admin API
- ✅ Admin API routes:
  - `GET /api/admin/courses/[courseId]/enrollments` - List enrollments with filtering & pagination
  - `POST /api/admin/courses/[courseId]/enrollments` - Create enrollments
  - `GET/PATCH/DELETE /api/admin/courses/[courseId]/enrollments/[enrollmentId]` - Manage specific enrollments

### Missing Components
- ❌ Comprehensive student progress analytics
- ❌ User engagement metrics and visualization
- ❌ Enrollment management dashboard
- ❌ Revenue tracking and reporting
- ❌ Content performance insights

## Current Context
Administrators need a robust interface to:

1. Verify and manage enrollments from Xendit/Shopify payments
2. Track student progress and engagement with course content
3. Understand which parts of the course are most effective
4. Manage announcements and live class schedules
5. Access business insights about enrollments and student engagement

## Future State Goal
A comprehensive admin experience with:

1. **Enhanced Enrollment Management**
   - Streamlined interface for viewing and managing enrollments
   - Quick verification of new enrollments from payment systems
   - Bulk operations for enrollment management
   - Search and filter capabilities for finding specific students

2. **Student Progress Analytics**
   - Visual dashboards showing course completion rates
   - Module and lesson engagement metrics
   - Time spent metrics and student activity patterns
   - Cohort analysis of student progress

3. **Content Performance Insights**
   - Lesson engagement and completion statistics
   - Identification of high-engagement and low-engagement content
   - Time spent on specific content areas
   - Feedback aggregation

4. **Announcement & Live Class Management**
   - Interface for creating and managing announcements
   - Calendar for scheduling and managing live classes
   - Attendance tracking for live sessions

## Implementation Plan

### 1. Admin Dashboard Enhancement

- [ ] Revamp admin dashboard layout:
  ```tsx
  // In app/admin/dashboard/page.tsx
  import { Suspense } from 'react';
  import { AdminHeader } from '@/components/admin/admin-header';
  import { AdminEnrollmentStats } from '@/components/admin/enrollment-stats';
  import { AdminEngagementChart } from '@/components/admin/engagement-chart';
  import { AdminRecentEnrollments } from '@/components/admin/recent-enrollments';
  import { AdminContentPerformance } from '@/components/admin/content-performance';
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
  
  export default function AdminDashboard() {
    return (
      <div className="space-y-6 p-6">
        <AdminHeader 
          title="Dashboard" 
          description="Monitor student enrollment and engagement"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Suspense fallback={<div>Loading stats...</div>}>
            <AdminEnrollmentStats />
          </Suspense>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Enrollment Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading chart...</div>}>
                <AdminEngagementChart />
              </Suspense>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Course Content Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div>Loading performance...</div>}>
                <AdminContentPerformance />
              </Suspense>
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Loading enrollments...</div>}>
              <AdminRecentEnrollments />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    );
  }
  ```

- [ ] Create enrollment stats component:
  ```tsx
  // In components/admin/enrollment-stats.tsx
  import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
  import { getEnrollmentStats } from '@/lib/admin/enrollment-stats';
  
  export async function AdminEnrollmentStats() {
    const stats = await getEnrollmentStats();
    
    return (
      <>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Enrollments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
            <p className="text-xs text-muted-foreground">
              {stats.enrollmentChange > 0 ? '+' : ''}{stats.enrollmentChange}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeStudents}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeChange > 0 ? '+' : ''}{stats.activeChange}% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Completion Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.completionChange > 0 ? '+' : ''}{stats.completionChange}% from last month
            </p>
          </CardContent>
        </Card>
      </>
    );
  }
  ```

### 2. Enrollment Management Interface

- [ ] Enhance enrollment management page:
  ```tsx
  // In app/admin/enrollments/page.tsx
  import { Suspense } from 'react';
  import { AdminHeader } from '@/components/admin/admin-header';
  import { EnrollmentTable } from '@/components/admin/enrollment-table';
  import { EnrollmentFilters } from '@/components/admin/enrollment-filters';
  import { Card } from '@/components/ui/card';
  
  export default function EnrollmentsPage({ searchParams }) {
    return (
      <div className="space-y-6 p-6">
        <AdminHeader 
          title="Enrollment Management" 
          description="View and manage student enrollments"
        />
        
        <Card>
          <EnrollmentFilters />
          <Suspense fallback={<div>Loading enrollments...</div>}>
            <EnrollmentTable searchParams={searchParams} />
          </Suspense>
        </Card>
      </div>
    );
  }
  ```

- [ ] Implement enrollment table component with advanced features:
  ```tsx
  // In components/admin/enrollment-table.tsx
  import { useState } from 'react';
  import { 
    Table, TableBody, TableCell, TableHead, 
    TableHeader, TableRow 
  } from '@/components/ui/table';
  import { Button } from '@/components/ui/button';
  import { Badge } from '@/components/ui/badge';
  import { 
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, 
    DropdownMenuTrigger 
  } from '@/components/ui/dropdown-menu';
  import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
  import { MoreHorizontal, ArrowUpDown, Download } from 'lucide-react';
  import { getEnrollments } from '@/lib/admin/enrollment-data';
  import { format } from 'date-fns';
  
  export function EnrollmentTable({ searchParams }) {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    
    const {
      enrollments,
      totalCount,
      pageCount,
    } = getEnrollments({
      status: searchParams.status,
      search: searchParams.search,
      course: searchParams.course,
      page: pageIndex,
      pageSize,
    });
    
    return (
      <div>
        <div className="flex justify-between items-center py-4">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
        
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>
                <div className="flex items-center space-x-1">
                  <span>Course</span>
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>
                <div className="flex items-center space-x-1">
                  <span>Enrolled</span>
                  <ArrowUpDown className="h-4 w-4" />
                </div>
              </TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {enrollments.map((enrollment) => (
              <TableRow key={enrollment.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={enrollment.user.avatar_url} />
                      <AvatarFallback>
                        {enrollment.user.firstName?.[0] || enrollment.user.email[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="font-medium">{enrollment.user.email}</div>
                  </div>
                </TableCell>
                <TableCell>{enrollment.course.title}</TableCell>
                <TableCell>{format(new Date(enrollment.enrolled_at), 'PP')}</TableCell>
                <TableCell>
                  <Badge variant={
                    enrollment.status === 'active' ? 'default' : 
                    enrollment.status === 'suspended' ? 'secondary' : 'destructive'
                  }>
                    {enrollment.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-primary h-2.5 rounded-full" 
                      style={{ width: `${enrollment.progress || 0}%` }}
                    ></div>
                  </div>
                  <span className="text-xs">{enrollment.progress || 0}%</span>
                </TableCell>
                <TableCell>
                  {enrollment.lastActive ? 
                    format(new Date(enrollment.lastActive), 'PP') : 
                    'Never'
                  }
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Details</DropdownMenuItem>
                      <DropdownMenuItem>Email Student</DropdownMenuItem>
                      <DropdownMenuItem>Reset Progress</DropdownMenuItem>
                      {enrollment.status === 'active' ? (
                        <DropdownMenuItem className="text-amber-600">
                          Suspend Enrollment
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className="text-green-600">
                          Activate Enrollment
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="text-red-600">
                        Delete Enrollment
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        
        {/* Pagination controls */}
      </div>
    );
  }
  ```

### 3. Student Progress Analytics

- [ ] Create analytics data fetching functions:
  ```typescript
  // In lib/admin/analytics.ts
  import { createServiceRoleClient } from '@/lib/supabase/service-role-client';
  import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

  export async function getCourseCompletionData() {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('course_progress')
      .select(`
        percent_complete,
        completed_at,
        user_id,
        course:courses (title)
      `)
      .order('updated_at', { ascending: false });
      
    if (error) throw error;
    
    // Group and analyze data
    const courseCompletionRates = {};
    
    data.forEach(item => {
      const courseTitle = item.course.title;
      
      if (!courseCompletionRates[courseTitle]) {
        courseCompletionRates[courseTitle] = {
          totalStudents: 0,
          completedStudents: 0,
          averageProgress: 0,
          totalProgress: 0,
        };
      }
      
      courseCompletionRates[courseTitle].totalStudents++;
      courseCompletionRates[courseTitle].totalProgress += item.percent_complete;
      
      if (item.completed_at) {
        courseCompletionRates[courseTitle].completedStudents++;
      }
    });
    
    // Calculate average progress
    Object.keys(courseCompletionRates).forEach(course => {
      const stats = courseCompletionRates[course];
      stats.averageProgress = stats.totalProgress / stats.totalStudents;
      stats.completionRate = (stats.completedStudents / stats.totalStudents) * 100;
    });
    
    return courseCompletionRates;
  }

  export async function getEngagementTrends() {
    const supabase = createServiceRoleClient();
    const now = new Date();
    
    // Get data for the last 6 months
    const monthlyData = [];
    
    for (let i = 0; i < 6; i++) {
      const monthDate = subMonths(now, i);
      const startDate = startOfMonth(monthDate);
      const endDate = endOfMonth(monthDate);
      const monthLabel = format(monthDate, 'MMM yyyy');
      
      // Get enrollments for the month
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('user_enrollments')
        .select('id')
        .gte('enrolled_at', startDate.toISOString())
        .lte('enrolled_at', endDate.toISOString());
        
      if (enrollmentError) throw enrollmentError;
      
      // Get active users for the month
      const { data: activeUsers, error: activeError } = await supabase
        .from('user_activity')
        .select('user_id')
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('user_id')
        .distinctOn('user_id');
        
      if (activeError) throw activeError;
      
      // Get lesson completions for the month
      const { data: completions, error: completionError } = await supabase
        .from('user_progress')
        .select('id')
        .gte('completed_at', startDate.toISOString())
        .lte('completed_at', endDate.toISOString());
        
      if (completionError) throw completionError;
      
      monthlyData.push({
        month: monthLabel,
        enrollments: enrollments.length,
        activeUsers: activeUsers.length,
        completions: completions.length,
      });
    }
    
    return monthlyData.reverse();
  }

  export async function getLessonEngagementData() {
    const supabase = createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('lessons')
      .select(`
        id,
        title,
        module:modules (
          title
        ),
        progress:user_progress (
          status,
          progress_percentage,
          completed_at
        )
      `);
      
    if (error) throw error;
    
    // Process and analyze lesson engagement
    const lessonEngagement = data.map(lesson => {
      const totalViews = lesson.progress.length;
      const completions = lesson.progress.filter(p => p.status === 'completed').length;
      const inProgress = lesson.progress.filter(p => p.status === 'in_progress').length;
      const notStarted = lesson.progress.filter(p => p.status === 'not_started').length;
      
      // Calculate average progress percentage
      const totalProgress = lesson.progress.reduce((sum, p) => sum + p.progress_percentage, 0);
      const averageProgress = totalViews > 0 ? totalProgress / totalViews : 0;
      
      return {
        id: lesson.id,
        title: lesson.title,
        module: lesson.module.title,
        totalViews,
        completions,
        completionRate: totalViews > 0 ? (completions / totalViews) * 100 : 0,
        inProgress,
        notStarted,
        averageProgress,
      };
    });
    
    return lessonEngagement.sort((a, b) => b.totalViews - a.totalViews);
  }
  ```

- [ ] Implement analytics visualization components:
  ```tsx
  // In components/admin/engagement-chart.tsx
  'use client';
  import { useEffect, useState } from 'react';
  import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from 'recharts';
  import { Card, CardContent } from '@/components/ui/card';
  import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
  
  export function AdminEngagementChart() {
    const [data, setData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    useEffect(() => {
      async function fetchData() {
        try {
          const response = await fetch('/api/admin/analytics/engagement');
          const result = await response.json();
          setData(result.data);
        } catch (error) {
          console.error('Failed to fetch engagement data:', error);
        } finally {
          setIsLoading(false);
        }
      }
      
      fetchData();
    }, []);
    
    if (isLoading) {
      return <div>Loading chart data...</div>;
    }
    
    return (
      <Tabs defaultValue="enrollments">
        <TabsList className="mb-4">
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="active">Active Users</TabsTrigger>
          <TabsTrigger value="completions">Completions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="enrollments">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="enrollments" fill="#4f46e5" name="Enrollments" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="active">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="activeUsers" fill="#06b6d4" name="Active Users" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
        
        <TabsContent value="completions">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completions" fill="#10b981" name="Lesson Completions" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </TabsContent>
      </Tabs>
    );
  }
  ```

### 4. Announcement Management

- [ ] Create announcement management interface:
  ```tsx
  // In app/admin/announcements/page.tsx
  import { Suspense } from 'react';
  import { AdminHeader } from '@/components/admin/admin-header';
  import { AnnouncementList } from '@/components/admin/announcement-list';
  import { CreateAnnouncementForm } from '@/components/admin/create-announcement-form';
  import { Card } from '@/components/ui/card';
  import { Button } from '@/components/ui/button';
  import { PlusCircle } from 'lucide-react';
  import { Dialog, DialogTrigger, DialogContent } from '@/components/ui/dialog';
  
  export default function AnnouncementsPage() {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <AdminHeader 
            title="Announcements" 
            description="Create and manage student announcements"
          />
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                New Announcement
              </Button>
            </DialogTrigger>
            <DialogContent>
              <CreateAnnouncementForm />
            </DialogContent>
          </Dialog>
        </div>
        
        <Card>
          <Suspense fallback={<div>Loading announcements...</div>}>
            <AnnouncementList />
          </Suspense>
        </Card>
      </div>
    );
  }
  ```

## Data Model Enhancements

```sql
-- Create analytics tables for optimized queries
CREATE TABLE IF NOT EXISTS public.analytics_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  enrollments INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  lesson_completions INTEGER DEFAULT 0,
  total_time_spent INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date)
);

-- Create admin activity log
CREATE TABLE IF NOT EXISTS public.admin_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_daily_date ON public.analytics_daily_activity(date);
CREATE INDEX IF NOT EXISTS idx_admin_activity_admin ON public.admin_activity(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_action ON public.admin_activity(action);
```

## Completion Status

Current progress status:

- [ ] Designing enhanced admin dashboard
- [ ] Implementing enrollment management interface
- [ ] Creating analytics visualizations
- [ ] Developing announcement management system

Next immediate priorities:
1. Complete the admin dashboard enhancement
2. Implement enrollment management interface with filtering and search
3. Create analytics data fetching functions and visualizations
4. Build announcement management system

## Next Steps

After completing the Admin Experience & Analytics implementation, we will proceed to:

1. **User Feedback & Iteration** - Collect admin feedback and refine functionality
2. **Integration Testing** - Ensure all three phases work seamlessly together

---

> **Note to AI Developers**: When working with this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
