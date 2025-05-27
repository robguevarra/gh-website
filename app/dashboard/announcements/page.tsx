'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/auth-context';
import { useAnnouncementsData } from '@/lib/hooks/use-dashboard-store';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { format, isToday, isTomorrow, isThisWeek, isAfter } from 'date-fns';
import type { Database } from '@/types/supabase';
import { 
  Calendar, 
  ShoppingBag, 
  Megaphone, 
  ChevronRight, 
  ChevronLeft,
  BookOpen,
  Bell,
  Clock,
  MapPin,
  ExternalLink,
  Tag,
  Users,
  Star
} from 'lucide-react';

// Define Announcement type based on Supabase schema
// Define Announcement type based on Supabase database schema
type Announcement = Database['public']['Tables']['announcements']['Row'];

// Helper type to properly type-cast announcement type values
type AnnouncementType = 'general_update' | 'live_class' | 'sale_promo' | 'new_content';

// Format date in a human-readable way
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) return `Today, ${format(date, 'h:mm a')}`;
  if (isTomorrow(date)) return `Tomorrow, ${format(date, 'h:mm a')}`;
  if (isThisWeek(date)) return format(date, 'EEEE, h:mm a');
  return format(date, 'MMMM d, yyyy');
};

// Type that matches exactly what AnnouncementCard expects
interface SafeAnnouncement {
  id: string;
  title: string;
  content: string; // Never null
  type: AnnouncementType; // Using our helper type
  publish_date: string | null;
  expiry_date: string | null;
  link_url: string | null;
  link_text: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  sort_order: number | null;
  host_name: string | null;
  host_avatar_url: string | null;
  location: string | null; // Exists in UI but might not in DB
  discount_percentage: number | null; // Exists in UI but might not in DB
  target_audience: string | null;
}

/**
 * Create a safe wrapper for announcements to handle null content and incompatible types
 * This function converts a database Announcement to a UI-safe SafeAnnouncement,
 * handling any missing or null fields and ensuring type compatibility
 */
const createSafeAnnouncement = (announcement: Announcement): SafeAnnouncement => {
  // Use type assertion to bypass TypeScript's type checking for incompatible types
  // We know that we're manually handling the incompatibilities here
  return {
    id: announcement.id,
    title: announcement.title,
    content: announcement.content || '', // Ensure content is never null
    type: announcement.type as AnnouncementType, // Cast string to our enum type
    publish_date: announcement.publish_date,
    expiry_date: announcement.expiry_date,
    link_url: announcement.link_url,
    link_text: announcement.link_text,
    image_url: announcement.image_url,
    created_at: announcement.created_at,
    updated_at: announcement.updated_at,
    status: announcement.status,
    sort_order: announcement.sort_order,
    host_name: announcement.host_name,
    host_avatar_url: announcement.host_avatar_url,
    // Add missing fields with defaults if they're not in the database schema
    location: (announcement as any).location || null,
    discount_percentage: (announcement as any).discount_percentage || null,
    target_audience: announcement.target_audience
  } as SafeAnnouncement; // Final type assertion to ensure compatibility
};

// Announcement card component for consistent display
const AnnouncementCard = ({ announcement }: { announcement: SafeAnnouncement }) => {
  // Determine icon and color based on announcement type
  let iconColor = 'text-brand-purple';
  let bgColor = 'bg-brand-purple/10';
  let borderColor = 'border-brand-purple/20';
  let hoverBgColor = 'hover:bg-brand-purple/5';
  let icon = <Megaphone className="h-5 w-5" />;
  let badgeText = 'General Update';
  
  switch(announcement.type) {
    case 'live_class':
      iconColor = 'text-brand-pink';
      bgColor = 'bg-brand-pink/10';
      borderColor = 'border-brand-pink/20';
      hoverBgColor = 'hover:bg-brand-pink/5';
      icon = <Calendar className="h-5 w-5" />;
      badgeText = 'Live Class';
      break;
    case 'sale_promo':
      iconColor = 'text-brand-purple';
      bgColor = 'bg-brand-purple/10';
      borderColor = 'border-brand-purple/20';
      hoverBgColor = 'hover:bg-brand-purple/5';
      icon = <Tag className="h-5 w-5" />;
      badgeText = 'Special Offer';
      break;
    case 'new_content':
      iconColor = 'text-brand-blue';
      bgColor = 'bg-brand-blue/10';
      borderColor = 'border-brand-blue/20';
      hoverBgColor = 'hover:bg-brand-blue/5';
      icon = <BookOpen className="h-5 w-5" />;
      badgeText = 'New Content';
      break;
    default: // general_update
      iconColor = 'text-green-600';
      bgColor = 'bg-green-100';
      borderColor = 'border-green-200';
      hoverBgColor = 'hover:bg-green-50';
      icon = <Bell className="h-5 w-5" />;
      badgeText = 'Announcement';
  }
  
  // Check if announcement is upcoming
  const isUpcoming = announcement.publish_date && isAfter(new Date(announcement.publish_date), new Date());
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all duration-300 ${hoverBgColor} mb-4 ${borderColor}`}
    >
      <div className="p-4">
        {/* Header with date and badge */}
        <div className="flex items-center justify-between mb-2">
          <Badge 
            variant="outline" 
            className={`${iconColor} ${bgColor} border-0 font-medium text-xs px-2.5 py-0.5 rounded-full`}
          >
            <span className="flex items-center gap-1">
              {icon}
              {badgeText}
            </span>
          </Badge>
          
          {announcement.publish_date && (
            <span className="text-xs text-[#6d4c41] flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDate(announcement.publish_date)}
              {isUpcoming && (
                <Badge variant="outline" className="ml-1 text-xs bg-amber-50 text-amber-600 border-amber-200">
                  Upcoming
                </Badge>
              )}
            </span>
          )}
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-serif font-semibold text-[#5d4037] mb-1.5">{announcement.title}</h3>
        
        {/* Content area */}
        <div className="flex items-start gap-4">
          <div className="flex-1">
            {/* Main content */}
            <p className="text-sm text-[#6d4c41] whitespace-pre-line leading-relaxed line-clamp-3">
              {announcement.content?.substring(0, 200) || ''}
              {announcement.content && announcement.content.length > 200 ? '...' : ''}
            </p>
            
            {/* Additional metadata */}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#6d4c41]">
              {/* Host info for live classes */}
              {announcement.type === 'live_class' && announcement.host_name && (
                <div className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-brand-pink" />
                  <div className="flex items-center gap-1">
                    {announcement.host_avatar_url ? (
                      <img 
                        src={announcement.host_avatar_url} 
                        alt={announcement.host_name} 
                        className="h-5 w-5 rounded-full object-cover border border-brand-pink/20"
                      />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink text-xs font-medium">
                        {announcement.host_name.charAt(0)}
                      </div>
                    )}
                    <span>Hosted by <span className="font-medium">{announcement.host_name}</span></span>
                  </div>
                </div>
              )}
              
              {/* Location for live classes */}
              {announcement.type === 'live_class' && announcement.location && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand-pink" />
                  <span>{announcement.location}</span>
                </div>
              )}
              
              {/* Sale discount for promos */}
              {announcement.type === 'sale_promo' && announcement.discount_percentage && (
                <div className="flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-brand-purple" />
                  <span className="font-medium">{announcement.discount_percentage}% Off</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Image (if available) */}
          {announcement.image_url && (
            <div className="hidden md:block w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
              <img 
                src={announcement.image_url} 
                alt={announcement.title ?? 'Announcement image'} 
                className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
              />
            </div>
          )}
        </div>
        
        {/* Action button */}
        {announcement.link_url && (
          <div className="mt-3 flex justify-start">
            <Button 
              asChild 
              variant="outline"
              size="sm"
              className={`${iconColor} ${borderColor} border hover:${bgColor} rounded-full px-4 py-1 h-auto text-xs font-medium transition-all duration-300`}
            >
              <Link href={announcement.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                {announcement.link_text || (announcement.type === 'live_class' ? 'Join Community' : 'Learn More')}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Empty state component
const EmptyState = ({ type }: { type: string }) => {
  let title = 'No Announcements';
  let message = 'Check back soon for updates and news.';
  let icon = <Bell className="h-10 w-10" />;
  let iconColor = 'text-green-600';
  let bgColor = 'bg-green-50';
  
  switch(type) {
    case 'live_class':
      title = 'No Upcoming Classes';
      message = 'Check back soon for new live class announcements.';
      icon = <Calendar className="h-10 w-10" />;
      iconColor = 'text-brand-pink';
      bgColor = 'bg-brand-pink/5';
      break;
    case 'sale_promo':
      title = 'No Current Sales';
      message = 'Check back soon for special offers and promotions.';
      icon = <Tag className="h-10 w-10" />;
      iconColor = 'text-brand-purple';
      bgColor = 'bg-brand-purple/5';
      break;
    case 'new_content':
      title = 'No New Content Updates';
      message = 'Check back soon for new content announcements.';
      icon = <BookOpen className="h-10 w-10" />;
      iconColor = 'text-brand-blue';
      bgColor = 'bg-brand-blue/5';
      break;
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-xl shadow-sm border border-gray-100 p-10 text-center max-w-md mx-auto"
    >
      <div className={`w-20 h-20 ${bgColor} rounded-full flex items-center justify-center mx-auto mb-6 ${iconColor}`}>
        {icon}
      </div>
      <h3 className="text-xl font-serif font-semibold text-[#5d4037] mb-3">{title}</h3>
      <p className="text-[#6d4c41] leading-relaxed">{message}</p>
    </motion.div>
  );
};

export default function AnnouncementsPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Use the enhanced announcements hook with caching
  const {
    announcements,
    isLoadingAnnouncements: isLoading,
    hasAnnouncementsError,
    loadAnnouncements,
    isStale
  } = useAnnouncementsData();
  
  // Load announcements data with proper caching
  const fetchAnnouncements = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await loadAnnouncements(currentPage, 10, { type: activeTab === 'all' ? undefined : activeTab });
      // Update total pages from pagination info
      // In a future enhancement, we could include pagination data in the store
      const response = await fetch(`/api/announcements?page=${currentPage}&limit=10${activeTab !== 'all' ? `&type=${activeTab}` : ''}`);
      if (response.ok) {
        const data = await response.json();
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (error) {
      console.error('Error updating pagination:', error);
    }
  }, [user?.id, currentPage, activeTab, loadAnnouncements]);
  
  // Handle authentication and data loading
  useEffect(() => {
    // Redirect if not authenticated
    if (!isAuthLoading && !user) {
      window.location.href = '/auth/signin';
      return;
    }
    
    if (user && (announcements.length === 0 || isStale())) {
      fetchAnnouncements();
    }
  }, [user, isAuthLoading, announcements.length, isStale, fetchAnnouncements]);
  
  // Refresh data when tab or page changes
  useEffect(() => {
    if (user) {
      fetchAnnouncements();
    }
  }, [activeTab, currentPage, user, fetchAnnouncements]);
  
  // Filter announcements based on active tab - memoized to prevent unnecessary recalculations
  const filteredAnnouncements = useMemo(() => {
    if (activeTab === 'all') return announcements;
    return announcements.filter(announcement => announcement.type === activeTab);
  }, [announcements, activeTab]);
  
  // Count announcements by type - memoized to prevent unnecessary recalculations
  const counts = useMemo(() => ({
    all: announcements.length,
    live_class: announcements.filter(a => a.type === 'live_class').length,
    sale_promo: announcements.filter(a => a.type === 'sale_promo').length,
    new_content: announcements.filter(a => a.type === 'new_content').length,
    general_update: announcements.filter(a => a.type === 'general_update').length,
  }), [announcements]);
  
  // Loading skeleton component - memoized to prevent recreation on each render
  const LoadingSkeleton = useCallback(() => (
    <div className="space-y-6">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="flex justify-between items-center mb-4">
            <div className="h-6 bg-gray-200 rounded-full w-32"></div>
            <div className="h-4 bg-gray-200 rounded-full w-24"></div>
          </div>
          <div className="h-7 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="flex gap-6">
            <div className="flex-1 space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-10 bg-gray-200 rounded-full w-32 mt-6"></div>
            </div>
            <div className="hidden md:block w-40 h-40 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      ))}
    </div>
  ), []);
  
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-b from-[#f9f6f2] to-white pb-12"
    >
      <div className="container px-4 py-8 max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <h1 className="text-3xl md:text-4xl font-serif font-bold tracking-tight text-[#5d4037] mb-3">
              Announcements
            </h1>
            <p className="text-[#6d4c41] max-w-2xl mx-auto">
              Stay updated with the latest news, events, and special offers from Graceful Homeschooling
            </p>
          </motion.div>
          
          <Separator className="mt-8 mb-8 bg-brand-purple/10" />
        </div>
        
        {/* Tabs for filtering */}
        <Tabs 
          defaultValue="all" 
          value={activeTab}
          onValueChange={setActiveTab}
          className="mb-8"
        >
          <TabsList className="bg-white border border-gray-200 p-1.5 rounded-full shadow-sm mx-auto flex justify-center mb-2">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-brand-purple/10 data-[state=active]:text-brand-purple rounded-full px-4 py-1.5 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                All
                {counts.all > 0 && (
                  <Badge className="ml-1 bg-brand-purple/20 text-brand-purple border-0 rounded-full px-2 py-0">
                    {counts.all}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="live_class" 
              className="data-[state=active]:bg-brand-pink/10 data-[state=active]:text-brand-pink rounded-full px-4 py-1.5 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Live Classes
                {counts.live_class > 0 && (
                  <Badge className="ml-1 bg-brand-pink/20 text-brand-pink border-0 rounded-full px-2 py-0">
                    {counts.live_class}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="sale_promo" 
              className="data-[state=active]:bg-brand-purple/10 data-[state=active]:text-brand-purple rounded-full px-4 py-1.5 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Store Sales
                {counts.sale_promo > 0 && (
                  <Badge className="ml-1 bg-brand-purple/20 text-brand-purple border-0 rounded-full px-2 py-0">
                    {counts.sale_promo}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
            
            <TabsTrigger 
              value="new_content" 
              className="data-[state=active]:bg-brand-blue/10 data-[state=active]:text-brand-blue rounded-full px-4 py-1.5 transition-all duration-300"
            >
              <span className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                New Content
                {counts.new_content > 0 && (
                  <Badge className="ml-1 bg-brand-blue/20 text-brand-blue border-0 rounded-full px-2 py-0">
                    {counts.new_content}
                  </Badge>
                )}
              </span>
            </TabsTrigger>
          </TabsList>
          
          <AnimatePresence mode="wait">
            <TabsContent key="all" value="all" className="mt-8">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredAnnouncements.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {filteredAnnouncements.map((announcement) => {
                    // Use type assertion to ensure compatibility
                    const safeAnnouncement = createSafeAnnouncement(announcement as any);
                    return (
                      <AnnouncementCard 
                        key={announcement.id} 
                        announcement={safeAnnouncement} 
                      />
                    );
                  })}
                </motion.div>
              ) : (
                <EmptyState type="all" />
              )}
            </TabsContent>
            
            <TabsContent key="live_class" value="live_class" className="mt-8">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredAnnouncements.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {filteredAnnouncements.map((announcement) => {
                    // Use type assertion to ensure compatibility
                    const safeAnnouncement = createSafeAnnouncement(announcement as any);
                    return (
                      <AnnouncementCard 
                        key={announcement.id} 
                        announcement={safeAnnouncement} 
                      />
                    );
                  })}
                </motion.div>
              ) : (
                <EmptyState type="live_class" />
              )}
            </TabsContent>
            
            <TabsContent key="sale_promo" value="sale_promo" className="mt-8">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredAnnouncements.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {filteredAnnouncements.map((announcement) => {
                    // Use type assertion to ensure compatibility
                    const safeAnnouncement = createSafeAnnouncement(announcement as any);
                    return (
                      <AnnouncementCard 
                        key={announcement.id} 
                        announcement={safeAnnouncement} 
                      />
                    );
                  })}
                </motion.div>
              ) : (
                <EmptyState type="sale_promo" />
              )}
            </TabsContent>
            
            <TabsContent key="new_content" value="new_content" className="mt-8">
              {isLoading ? (
                <LoadingSkeleton />
              ) : filteredAnnouncements.length > 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="space-y-6"
                >
                  {filteredAnnouncements.map((announcement) => {
                    // Use type assertion to ensure compatibility
                    const safeAnnouncement = createSafeAnnouncement(announcement as any);
                    return (
                      <AnnouncementCard 
                        key={announcement.id} 
                        announcement={safeAnnouncement} 
                      />
                    );
                  })}
                </motion.div>
              ) : (
                <EmptyState type="new_content" />
              )}
            </TabsContent>
          </AnimatePresence>
        </Tabs>
        
        {/* Pagination Controls */}
        {totalPages > 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-12 flex justify-center items-center space-x-4"
          >
            <Button 
              variant="outline" 
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              className="rounded-full border-brand-purple/20 text-brand-purple hover:bg-brand-purple/10 transition-all duration-300"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <span className="text-sm font-medium text-[#6d4c41] px-4 py-2 bg-white rounded-full shadow-sm border border-gray-100">
              Page {currentPage} of {totalPages}
            </span>
            <Button 
              variant="outline" 
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              className="rounded-full border-brand-purple/20 text-brand-purple hover:bg-brand-purple/10 transition-all duration-300"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
