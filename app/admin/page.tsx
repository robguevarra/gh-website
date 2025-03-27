import { cookies } from 'next/headers';
import Link from 'next/link';
import type { Database } from '@/types/supabase';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AdminHeading } from '@/components/admin/admin-heading';
import {
  BarChart4,
  BookOpen,
  CreditCard,
  Settings,
  Users,
  Tag,
  BarChart2,
  Plus,
  ArrowRight,
  UserPlus,
  BarChart,
  DollarSign,
  Clock,
  ArrowUpRight,
  Shield,
  BookOpenCheck,
} from 'lucide-react';
import { DashboardOverview } from '@/components/admin/dashboard-overview';

export const metadata = {
  title: 'Admin Dashboard | Graceful Homeschooling',
  description: 'Manage your courses, students, and content.',
};

export default async function AdminDashboardPage() {
  return <DashboardOverview />;
} 