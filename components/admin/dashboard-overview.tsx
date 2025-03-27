"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, FileText, Users, BarChart2, Clock, TrendingUp, PlusCircle, User, Pencil } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardStats {
  totalCourses: number;
  publishedCourses: number;
  draftCourses: number;
  totalModules: number;
  totalLessons: number;
  totalUsers: number;
  recentCourses: RecentCourse[];
  activeUsers: ActiveUser[];
}

interface RecentCourse {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  featured_image?: string;
  updated_at: string;
}

interface ActiveUser {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  last_active: string;
}

export function DashboardOverview() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/admin/dashboard");
        
        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }
        
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        toast.error("Failed to load dashboard statistics");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return "Today";
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  // Render loading skeletons
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
        
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your course platform
          </p>
        </div>
        
        <Button onClick={() => router.push("/admin/courses/new")}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Course
        </Button>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Courses
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCourses || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.publishedCourses || 0} published, {stats?.draftCourses || 0} drafts
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Content
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalModules || 0} Modules</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalLessons || 0} lessons
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Active learners on your platform
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Activity
            </CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeUsers?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Users active in the past 7 days
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="recent">
        <TabsList>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
          <TabsTrigger value="courses">Recent Courses</TabsTrigger>
          <TabsTrigger value="users">Active Users</TabsTrigger>
        </TabsList>
        
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>
                The latest updates across your platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {stats?.recentCourses.length === 0 && stats?.activeUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Clock className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                    <h3 className="text-lg font-medium">No recent activity</h3>
                    <p className="text-sm text-muted-foreground">
                      You'll see updates here as users interact with your platform.
                    </p>
                  </div>
                ) : (
                  <>
                    {stats?.recentCourses.slice(0, 3).map((course) => (
                      <div 
                        key={course.id}
                        className="flex items-center space-x-3 border-b pb-3 last:border-0 last:pb-0"
                      >
                        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                          <Pencil className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">Course Updated</p>
                          <div 
                            className="text-sm text-blue-600 dark:text-blue-500 hover:underline cursor-pointer"
                            onClick={() => router.push(`/admin/courses/${course.id}`)}
                          >
                            {course.title}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{course.status}</Badge>
                          <div className="text-xs text-muted-foreground">
                            {formatDate(course.updated_at)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {stats?.activeUsers.slice(0, 3).map((user) => (
                      <div 
                        key={user.id}
                        className="flex items-center space-x-3 border-b pb-3 last:border-0 last:pb-0"
                      >
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm font-medium">User Activity</p>
                          <div className="text-sm text-muted-foreground">
                            {user.name} ({user.email})
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(user.last_active)}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <TrendingUp className="h-4 w-4 mr-2" />
                View All Activity
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="courses">
          <Card>
            <CardHeader>
              <CardTitle>Recent Courses</CardTitle>
              <CardDescription>
                Your recently updated courses
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {stats?.recentCourses.length === 0 ? (
                    <div className="text-center py-8">
                      <BookOpen className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">No courses yet</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Start creating your first course now.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => router.push("/admin/courses/new")}
                      >
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Create Course
                      </Button>
                    </div>
                  ) : (
                    stats?.recentCourses.map((course) => (
                      <div 
                        key={course.id} 
                        className="flex items-center space-x-4 border rounded-md p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/admin/courses/${course.id}`)}
                      >
                        <div className="h-12 w-12 rounded-md overflow-hidden flex items-center justify-center bg-muted">
                          {course.featured_image ? (
                            <img 
                              src={course.featured_image} 
                              alt={course.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <BookOpen className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{course.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Updated {formatDate(course.updated_at)}
                          </p>
                        </div>
                        <Badge variant={course.status === "published" ? "default" : "secondary"}>
                          {course.status === "published" ? "Published" : "Draft"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => router.push("/admin/courses")}
              >
                <BookOpen className="h-4 w-4 mr-2" />
                View All Courses
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Active Users</CardTitle>
              <CardDescription>
                Users who recently accessed your platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                <div className="space-y-4">
                  {stats?.activeUsers.length === 0 ? (
                    <div className="text-center py-8">
                      <User className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                      <h3 className="text-lg font-medium">No active users</h3>
                      <p className="text-sm text-muted-foreground">
                        User activity will be shown here once students engage with your courses.
                      </p>
                    </div>
                  ) : (
                    stats?.activeUsers.map((user) => (
                      <div key={user.id} className="flex items-center space-x-4 border rounded-md p-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{user.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user.email}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Last active: {formatDate(user.last_active)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full">
                <Users className="h-4 w-4 mr-2" />
                Manage Users
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 