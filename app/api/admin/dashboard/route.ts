import { NextResponse } from 'next/server';
import { createServerSupabaseClient as createServiceRoleClient } from '@/lib/supabase/client';

export async function GET() {
  try {
    // In a real implementation, we would fetch this data from our database
    // For now, return mock data
    const mockDashboardStats = {
      totalCourses: 12,
      publishedCourses: 8,
      draftCourses: 4,
      totalModules: 36,
      totalLessons: 124,
      totalUsers: 354,
      recentCourses: [
        {
          id: '1',
          title: 'Introduction to Homeschooling',
          slug: 'introduction-to-homeschooling',
          status: 'published',
          featured_image: '/images/courses/intro.jpg',
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
        },
        {
          id: '2',
          title: 'Curriculum Planning',
          slug: 'curriculum-planning',
          status: 'published',
          featured_image: '/images/courses/curriculum.jpg',
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        },
        {
          id: '3',
          title: 'Advanced Mathematics',
          slug: 'advanced-mathematics',
          status: 'draft',
          featured_image: '/images/courses/math.jpg',
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
        },
        {
          id: '4',
          title: 'Reading Strategies',
          slug: 'reading-strategies',
          status: 'published',
          featured_image: '/images/courses/reading.jpg',
          updated_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
        },
      ],
      activeUsers: [
        {
          id: '101',
          name: 'Jane Smith',
          email: 'jane@example.com',
          avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Jane',
          last_active: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
        },
        {
          id: '102',
          name: 'John Doe',
          email: 'john@example.com',
          avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=John',
          last_active: new Date(Date.now() - 1000 * 60 * 60 * 1).toISOString(), // 1 hour ago
        },
        {
          id: '103',
          name: 'Emma Wilson',
          email: 'emma@example.com',
          avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Emma',
          last_active: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
        },
        {
          id: '104',
          name: 'Michael Brown',
          email: 'michael@example.com',
          avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Michael',
          last_active: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
        },
        {
          id: '105',
          name: 'Sophia Garcia',
          email: 'sophia@example.com',
          avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Sophia',
          last_active: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
        },
      ],
    };

    return NextResponse.json(mockDashboardStats);
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard statistics" },
      { status: 500 }
    );
  }
} 