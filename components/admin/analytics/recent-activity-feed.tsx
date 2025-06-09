'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ActivityLogItem } from '@/lib/actions/activity-log-actions';

type ActivityIconProps = {
  activityType: string;
};

const activityIcons: Record<string, { icon: string; color: string }> = {
  AFFILIATE_STATUS_CHANGE: { icon: '👤', color: 'bg-blue-100 text-blue-700' },
  AFFILIATE_APPLICATION: { icon: '📝', color: 'bg-green-100 text-green-700' },
  AFFILIATE_SETTINGS_UPDATE: { icon: '⚙️', color: 'bg-gray-100 text-gray-700' },
  AFFILIATE_COMMISSION_RATE_UPDATE: { icon: '💰', color: 'bg-amber-100 text-amber-700' },
  AFFILIATE_PAYOUT_PROCESSED: { icon: '💸', color: 'bg-purple-100 text-purple-700' },
  FRAUD_FLAG_CREATED: { icon: '🚩', color: 'bg-red-100 text-red-700' },
  FRAUD_FLAG_RESOLVED: { icon: '✓', color: 'bg-green-100 text-green-700' },
  ADMIN_LOGIN: { icon: '🔑', color: 'bg-slate-100 text-slate-700' },
  USER_PROFILE_UPDATE_ADMIN: { icon: '👤', color: 'bg-teal-100 text-teal-700' },
  MEMBERSHIP_LEVEL_UPDATE_ADMIN: { icon: '⭐', color: 'bg-yellow-100 text-yellow-700' },
  GENERAL_ADMIN_ACTION: { icon: '🔧', color: 'bg-gray-100 text-gray-700' },
};

const ActivityIcon = ({ activityType }: ActivityIconProps) => {
  const { icon, color } = activityIcons[activityType] || activityIcons.GENERAL_ADMIN_ACTION;

  return (
    <div className={`p-2 rounded-full ${color} flex items-center justify-center w-10 h-10`}>
      <span className="text-lg">{icon}</span>
    </div>
  );
};

interface RecentActivityFeedProps {
  logs: ActivityLogItem[];
  isLoading?: boolean;
  error?: string;
}

export const RecentActivityFeed = ({ logs, isLoading = false, error }: RecentActivityFeedProps) => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="col-span-4 h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Loading recent activity logs...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 animate-pulse">
            {Array(5).fill(0).map((_, index) => (
              <div key={index} className="flex items-start space-x-4">
                <div className="bg-slate-200 w-10 h-10 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                  <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-4 h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Failed to load activity logs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-red-50 text-red-600 rounded-md">
            Error: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="col-span-4 h-full">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Track admin actions and events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 text-center text-slate-500">
            No activity logs found
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 h-full">
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Track admin actions and events</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {logs.map((log) => (
          <div
            key={log.id}
            className="flex items-start space-x-4 p-3 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <ActivityIcon activityType={log.activity_type} />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{log.description}</p>
                  <div className="flex items-center mt-1 space-x-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center">
                            <Avatar className="h-6 w-6 mr-2">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {log.admin_name ? log.admin_name.split(' ').map(n => n[0]).join('') : 'A'}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {log.admin_name || 'Admin'}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {log.admin_email || 'Unknown admin'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                {log.details && (
                  <button
                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                    className="text-xs text-primary hover:text-primary/80"
                  >
                    {expandedLogId === log.id ? 'Less' : 'More'}
                  </button>
                )}
              </div>
              
              {expandedLogId === log.id && log.details && (
                <div className="mt-3 p-2 bg-slate-50 rounded border text-xs font-mono overflow-x-auto">
                  <pre className="whitespace-pre-wrap break-words">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RecentActivityFeed;
