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
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Star,
  Award,
  Eye,
  Activity,
  Zap
} from "lucide-react";
import { Suspense } from "react";
import AffiliateList from '@/components/admin/affiliates/affiliate-list';
import { getAffiliateStats } from '@/lib/actions/affiliate-actions';

export const metadata: Metadata = {
  title: "Affiliate Partners | Admin Dashboard",
  description: "Manage affiliate partners, review applications, and monitor performance with comprehensive analytics",
};

async function AffiliateStats() {
  const { 
    totalAffiliates, 
    activeAffiliates, 
    pendingApplications, 
    newThisMonth, 
    growthPercentage,
    error 
  } = await getAffiliateStats();

  // Handle error state gracefully with fallback data
  if (error) {
    console.error('Failed to load affiliate stats:', error);
  }

  const activePercentage = totalAffiliates > 0 ? ((activeAffiliates / totalAffiliates) * 100).toFixed(1) : '0.0';
  const isGrowthPositive = growthPercentage >= 0;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {/* Total Affiliates Card */}
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-[#faf8f5] shadow-sm hover:shadow-md transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-[#b08ba5]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-[#5d4037] font-['Inter']">
            Total Affiliates
          </CardTitle>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#b08ba5] to-[#f1b5bc] shadow-sm">
            <Users className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-[#3e2723] font-['Playfair_Display'] mb-1">
            {totalAffiliates.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm text-[#6d4c41]">+{newThisMonth}</span>
            <span className="text-xs text-[#8d6e63]">from last month</span>
          </div>
        </CardContent>
      </Card>

      {/* Active Affiliates Card */}
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-[#f0f8f0] shadow-sm hover:shadow-md transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-[#5d4037] font-['Inter']">
            Active Affiliates
          </CardTitle>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-sm">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-emerald-700 font-['Playfair_Display'] mb-1">
            {activeAffiliates.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-sm font-medium text-emerald-600">{activePercentage}%</span>
            <span className="text-xs text-emerald-500">of total partners</span>
          </div>
        </CardContent>
      </Card>

      {/* Pending Applications Card */}
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-[#fff8f0] shadow-sm hover:shadow-md transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-[#5d4037] font-['Inter']">
            Pending Applications
          </CardTitle>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 shadow-sm">
            <Clock className="h-5 w-5 text-white" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-amber-700 font-['Playfair_Display'] mb-1">
            {pendingApplications.toLocaleString()}
          </div>
          <div className="flex items-center gap-1">
            {pendingApplications > 0 ? (
              <>
                <AlertTriangle className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-600">Awaiting review</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                <span className="text-xs text-emerald-600">All caught up!</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Growth Card */}
      <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-white to-[#f0f8ff] shadow-sm hover:shadow-md transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-[#9ac5d9]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium text-[#5d4037] font-['Inter']">
            Growth This Month
          </CardTitle>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#9ac5d9] to-blue-500 shadow-sm">
            {isGrowthPositive ? (
              <TrendingUp className="h-5 w-5 text-white" />
            ) : (
              <Activity className="h-5 w-5 text-white" />
            )}
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className={`text-3xl font-bold font-['Playfair_Display'] mb-1 flex items-center gap-1 ${
            isGrowthPositive ? 'text-blue-700' : 'text-slate-600'
          }`}>
            {isGrowthPositive ? '+' : ''}{growthPercentage.toFixed(1)}%
            {isGrowthPositive ? (
              <ArrowUpRight className="h-4 w-4 text-blue-500" />
            ) : (
              <ArrowDownRight className="h-4 w-4 text-slate-500" />
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className={`text-xs ${isGrowthPositive ? 'text-blue-600' : 'text-slate-500'}`}>
              {isGrowthPositive ? 'Growing strong' : 'Stable growth'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAffiliatesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#faf8f5] via-white to-[#f8f6f3]">
      <div className="flex-1 space-y-8 p-6 max-w-7xl mx-auto">
        {/* Enhanced Header Section */}
        <div className="relative">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#b08ba5] to-[#f1b5bc] shadow-lg">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold text-[#3e2723] font-['Playfair_Display'] tracking-tight">
                    Affiliate Partners
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Award className="h-4 w-4 text-[#b08ba5]" />
                    <span className="text-[#6d4c41] font-['Inter'] text-sm">
                      Excellence in Partnership Management
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-[#8d6e63] font-['Inter'] max-w-2xl leading-relaxed">
                Manage affiliate partnerships, review applications, and monitor performance with comprehensive analytics. 
                Build lasting relationships that drive sustainable growth.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button 
                className="bg-gradient-to-r from-[#b08ba5] to-[#f1b5bc] hover:from-[#9d7a92] hover:to-[#eda2a9] text-white shadow-lg hover:shadow-xl transition-all duration-300 font-['Inter'] font-medium px-6"
                size="lg"
              >
                <UserPlus className="mr-2 h-5 w-5" />
                Invite Affiliate
              </Button>
              <Button 
                variant="outline" 
                className="border-[#b08ba5] text-[#b08ba5] hover:bg-[#b08ba5] hover:text-white transition-all duration-300 font-['Inter'] font-medium px-6"
                size="lg"
              >
                <Shield className="mr-2 h-5 w-5" />
                Review Applications
              </Button>
            </div>
          </div>
        </div>

        {/* Enhanced Stats Overview */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#9ac5d9] to-blue-500">
              <Activity className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-[#3e2723] font-['Playfair_Display']">
              Performance Overview
            </h2>
          </div>
          
          <Suspense fallback={
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 animate-pulse" />
              ))}
            </div>
          }>
            <AffiliateStats />
          </Suspense>
        </div>

        {/* Enhanced Affiliate Directory */}
        <Card className="border-0 bg-white/80 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300">
          <CardHeader className="bg-gradient-to-r from-[#faf8f5] to-white border-b border-[#e9e0d8]">
            <CardTitle className="flex items-center gap-3 text-[#3e2723] font-['Playfair_Display'] text-xl">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-[#b08ba5] to-[#f1b5bc]">
                <Users className="h-4 w-4 text-white" />
              </div>
              Affiliate Directory
              <Badge variant="secondary" className="ml-auto bg-[#f1b5bc]/20 text-[#b08ba5] hover:bg-[#f1b5bc]/30">
                <Eye className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <Suspense fallback={
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-gradient-to-r from-slate-100 to-slate-200 animate-pulse" />
                ))}
              </div>
            }>
              <AffiliateList />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
