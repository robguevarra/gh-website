'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Bell, AlertTriangle } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar } from '@/components/ui/avatar';
import { FraudRiskLevel } from '@/types/admin/fraud-notification';
import { formatDistanceToNow } from 'date-fns';
import { markFraudFlagAsReviewed } from '@/lib/actions/fraud-notification-actions-simplified';
import { AdminFraudFlagListItem } from '@/types/admin/affiliate';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface HighRiskFraudFlag extends AdminFraudFlagListItem {
  risk: {
    level: FraudRiskLevel;
    score: number;
    factors: string[];
  };
}

interface FraudNotificationBadgeProps {
  initialNotifications: HighRiskFraudFlag[];
}

export function FraudNotificationBadge({ 
  initialNotifications 
}: FraudNotificationBadgeProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<HighRiskFraudFlag[]>(initialNotifications || []);
  const [isOpen, setIsOpen] = useState(false);

  // Risk level colors
  const getRiskLevelColor = (level: string): string => {
    switch (level) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      default:
        return 'bg-blue-500';
    }
  };

  // Function to handle marking a notification as read
  const handleMarkAsRead = async (flagId: string) => {
    try {
      const result = await markFraudFlagAsReviewed(flagId);
      
      if (result.success) {
        // Update local state
        setNotifications(prev => 
          prev.filter(flag => flag.id !== flagId)
        );
        
        // Show success toast
        toast.success('Fraud flag marked as reviewed');
      } else {
        toast.error(result.error || 'Failed to mark fraud flag as reviewed');
      }
    } catch (error) {
      console.error('Error marking fraud flag as reviewed:', error);
      toast.error('An unexpected error occurred');
    }
  };

  // Navigate to fraud flag details
  const viewFlagDetails = (flagId: string) => {
    router.push(`/admin/affiliates/flags?highlight=${flagId}`);
  };

  // If no notifications, don't render the component
  if (notifications.length === 0) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="relative h-8 w-8 rounded-full p-0"
          aria-label="Open fraud notifications"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {notifications.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-2">
          <h4 className="font-semibold text-sm">Fraud Alerts</h4>
          <span className="text-xs text-muted-foreground">
            {notifications.length} unread
          </span>
        </div>
        <ScrollArea className="max-h-80">
          <div className="flex flex-col">
            {notifications.map((flag) => (
              <div 
                key={flag.id} 
                className="flex flex-col p-3 border-b last:border-b-0"
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center">
                    <Avatar className={`h-8 w-8 mr-2 ${getRiskLevelColor(flag.risk.level)}`}>
                      <AlertTriangle className="h-4 w-4 text-white" />
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {flag.affiliate_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {flag.reason}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant={flag.risk.level === 'high' ? 'destructive' : 'outline'} 
                    className="text-xs"
                  >
                    {flag.risk.level === 'high' ? 'High Risk' : 'Medium Risk'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => handleMarkAsRead(flag.id)}
                    >
                      Dismiss
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-7 text-xs"
                      onClick={() => {
                        viewFlagDetails(flag.id);
                        setIsOpen(false);
                      }}
                    >
                      View
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
