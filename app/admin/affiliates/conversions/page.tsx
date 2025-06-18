'use client';

import { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  Package,
  Settings,
  FileText,
  Eye,
  ArrowRight,
  TrendingUp,
  Activity
} from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { getConversionStats, getAdminConversions } from "@/lib/actions/admin/conversion-actions";

// Clean, focused conversion overview page
// Industry best practice: Stripe-style dashboard with quick status overview and priority actions

interface ConversionStats {
  total_pending: number;
  total_flagged: number;
  total_cleared: number;
  total_paid: number;
}

interface RecentConversion {
  conversion_id: string;
  affiliate_name: string;
  order_id: string;
  commission_amount: number;
  status: string;
  created_at: string;
}

function StatusOverviewCards({ stats }: { stats: ConversionStats }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {/* Pending Conversions */}
      <Link href="/admin/affiliates/conversions/list?status=pending" className="block">
        <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
          <Clock className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{stats.total_pending}</div>
          <p className="text-xs text-muted-foreground">
              Awaiting processing
          </p>
        </CardContent>
      </Card>
      </Link>

      {/* Flagged Conversions - Priority */}
      <Link href="/admin/affiliates/conversions/list?status=flagged" className="block">
        <Card className={`hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer ${stats.total_flagged > 0 ? 'border-orange-200 bg-orange-50/50' : ''}`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Flagged for Review</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-600" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.total_flagged}</div>
          <p className="text-xs text-muted-foreground">
              Need immediate attention
          </p>
        </CardContent>
      </Card>
      </Link>

      {/* Cleared Conversions */}
      <Link href="/admin/affiliates/conversions/list?status=cleared" className="block">
        <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cleared for Payout</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.total_cleared}</div>
          <p className="text-xs text-muted-foreground">
              Ready for batch
          </p>
        </CardContent>
      </Card>
      </Link>

      {/* Paid Conversions */}
      <Link href="/admin/affiliates/conversions/list?status=paid" className="block">
        <Card className="hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-pointer">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Paid Out</CardTitle>
          <DollarSign className="h-4 w-4 text-blue-600" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total_paid}</div>
          <p className="text-xs text-muted-foreground">
            Successfully processed
          </p>
        </CardContent>
      </Card>
      </Link>
    </div>
  );
}

function PrioritySection({ flaggedCount }: { flaggedCount: number }) {
  if (flaggedCount === 0) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-medium text-green-900">All Clear!</p>
              <p className="text-sm text-green-700">No flagged conversions requiring review</p>
            </div>
      </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-orange-200 bg-orange-50/50">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-medium text-orange-900">
                {flaggedCount} Conversion{flaggedCount > 1 ? 's' : ''} Need Review
              </p>
              <p className="text-sm text-orange-700">
                Fraud detection alerts require immediate attention
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/affiliates/conversions?status=flagged">
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                Review Flagged
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActions({ clearedCount }: { clearedCount: number }) {
    return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-4">
          {/* Analytics */}
          <Link href="/admin/affiliates/monthly-preview" className="block">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              <div className="text-center">
                <div className="font-medium">Analytics</div>
                <div className="text-xs text-muted-foreground">Monthly insights</div>
              </div>
            </Button>
          </Link>

          {/* Create Batch */}
          <Link href="/admin/affiliates/batch-preview" className="block">
            <Button 
              variant={clearedCount > 0 ? "default" : "outline"} 
              className="w-full h-auto p-4 flex flex-col items-center gap-2"
              disabled={clearedCount === 0}
            >
              <Package className="h-5 w-5" />
              <div className="text-center">
                <div className="font-medium">Create Batch</div>
                <div className="text-xs text-muted-foreground">
                  {clearedCount > 0 ? `${clearedCount} ready` : 'None ready'}
                </div>
              </div>
            </Button>
          </Link>

          {/* Monitoring */}
          <Link href="/admin/affiliates/payouts/monitoring" className="block">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              <div className="text-center">
                <div className="font-medium">Monitoring</div>
                <div className="text-xs text-muted-foreground">System health</div>
              </div>
            </Button>
          </Link>

          {/* Settings */}
          <Link href="/admin/affiliates/settings" className="block">
            <Button variant="outline" className="w-full h-auto p-4 flex flex-col items-center gap-2">
              <Settings className="h-5 w-5 text-gray-600" />
              <div className="text-center">
                <div className="font-medium">Settings</div>
                <div className="text-xs text-muted-foreground">Thresholds & rules</div>
              </div>
            </Button>
          </Link>
      </div>
      </CardContent>
    </Card>
    );
  }

function RecentActivity() {
  const [recentConversions, setRecentConversions] = useState<RecentConversion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecentActivity() {
      try {
        const result = await getAdminConversions({
          filters: {},
          pagination: { page: 1, pageSize: 10 }
        });
        
        if (result.data) {
          setRecentConversions(result.data.map((conv: any) => ({
            conversion_id: conv.conversion_id,
            affiliate_name: conv.affiliate_name || 'Unknown',
            order_id: conv.order_id,
            commission_amount: conv.commission_amount,
            status: conv.status,
            created_at: conv.created_at
          })));
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecentActivity();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800';
      case 'flagged': return 'bg-red-100 text-red-800';
      case 'cleared': return 'bg-green-100 text-green-800';
      case 'paid': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Link href="/admin/affiliates/conversions/list">
          <Button variant="ghost" size="sm">
            View All
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : recentConversions.length > 0 ? (
          <div className="space-y-3">
            {recentConversions.map((conversion) => (
          <Link 
            key={conversion.conversion_id} 
                href={`/admin/affiliates/conversions/list?search=${conversion.order_id}`}
            className="block"
          >
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(conversion.status)}>
                  {conversion.status}
                </Badge>
                <div>
                      <p className="font-medium text-sm">{conversion.affiliate_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Order #{conversion.order_id}
                  </p>
                </div>
              </div>
              <div className="text-right">
                    <p className="font-medium text-sm">₱{conversion.commission_amount.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(conversion.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No recent conversions</p>
        </div>
      )}
      </CardContent>
    </Card>
  );
}

export default function ConversionsPage() {
  const [stats, setStats] = useState<ConversionStats>({
    total_pending: 0,
    total_flagged: 0,
    total_cleared: 0,
    total_paid: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const result = await getConversionStats();
        if (result && result.stats) {
          // Only update with the basic stats needed for this page
          setStats({
            total_pending: result.stats.total_pending,
            total_flagged: result.stats.total_flagged,
            total_cleared: result.stats.total_cleared,
            total_paid: result.stats.total_paid
          });
        } else {
          console.log('No stats returned, using defaults');
          // Keep default stats (all zeros)
        }
      } catch (error) {
        console.error('Error fetching conversion stats:', error);
        // Keep default stats on error
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Clean Header */}
      <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversions & Payouts</h1>
        <p className="text-muted-foreground">
            Monitor conversion status and manage affiliate payments
        </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/affiliates/monthly-preview">
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </Link>
          <Link href="/admin/affiliates/settings">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Status Overview Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <StatusOverviewCards stats={stats} />
      )}

      {/* Priority Section */}
      {!loading && (
        <PrioritySection flaggedCount={stats.total_flagged} />
      )}

      {/* Quick Actions */}
      {!loading && (
        <QuickActions clearedCount={stats.total_cleared} />
      )}

      {/* Recent Activity */}
      <RecentActivity />
    </div>
  );
} 