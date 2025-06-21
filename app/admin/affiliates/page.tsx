import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  UserPlus, 
  TrendingUp,
  Shield,
  Clock,
  CheckCircle2
} from "lucide-react";
import { Suspense } from "react";
import AffiliateList from '@/components/admin/affiliates/affiliate-list';
import { getAffiliateStats } from '@/lib/actions/affiliate-actions';

export const metadata: Metadata = {
  title: "Affiliates | Admin",
  description: "Manage affiliate users, applications, and account details",
};

async function AffiliateStats() {
  // Get affiliate stats with built-in error handling
  // The function now returns fallback data instead of throwing errors
  const stats = await getAffiliateStats();
  
  // Check if we got actual data or fallback data (indicates connection issues)
  const hasConnectionIssues = stats.totalAffiliates === 0 && 
    stats.activeAffiliates === 0 && 
    stats.pendingApplications === 0 && 
    stats.newThisMonth === 0 && 
    stats.growthPercentage === 0;

  const error = hasConnectionIssues ? 
    'Database connection temporarily unavailable. Showing cached data.' : 
    null;

  return (
    <div className="space-y-4">
      {/* Error Alert */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="font-medium text-red-900">Statistics Temporarily Unavailable</h3>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAffiliates}</div>
            <p className="text-xs text-muted-foreground">
              +{stats.newThisMonth} from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Affiliates</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.activeAffiliates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalAffiliates > 0 ? 
                ((stats.activeAffiliates / stats.totalAffiliates) * 100).toFixed(1) : '0'}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pendingApplications}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.growthPercentage > 0 ? '+' : ''}{stats.growthPercentage}%
            </div>
            <p className="text-xs text-muted-foreground">
              Growth this month
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AdminAffiliatesPage() {
  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header section with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Affiliate Partners</h1>
          <p className="text-muted-foreground">
            Manage affiliate users, review applications, and monitor account performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Affiliate
          </Button>
          <Button variant="outline">
            <Shield className="mr-2 h-4 w-4" />
            Review Applications
          </Button>
        </div>
      </div>

      {/* Stats overview */}
      <Suspense fallback={
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      }>
        <AffiliateStats />
      </Suspense>

      {/* Main affiliate list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Affiliate Directory
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          }>
            <AffiliateList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
