'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Clock, ExternalLink, Filter, RotateCcw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

// Define the activity log entry type
interface ActivityLogEntry {
  id: string;
  user_id: string;
  activity_type: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: any | null;
  ip_address: string | null;
  user_agent: string | null;
  session_id: string | null;
  created_at: string;
}

interface UserActivityProps {
  userId: string;
  activityLog: ActivityLogEntry[];
}

/**
 * User Activity component
 * Displays user activity history with filtering options
 */
export function UserActivity({ userId, activityLog = [] }: UserActivityProps) {
  const [filter, setFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activities, setActivities] = useState<ActivityLogEntry[]>(activityLog);

  // Format date to be user-friendly
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  // Get activity type badge color
  const getActivityBadgeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'login':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'logout':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'purchase':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'enrollment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'content_view':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Filter activities
  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(activity => activity.activity_type.toLowerCase() === filter.toLowerCase());

  // Refresh activity log
  const refreshActivityLog = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/activity?limit=50`);
      if (!response.ok) throw new Error('Failed to fetch activity log');
      
      const data = await response.json();
      setActivities(data);
    } catch (error) {
      console.error('Error refreshing activity log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-medium">User Activity History</h3>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activities</SelectItem>
              <SelectItem value="login">Logins</SelectItem>
              <SelectItem value="logout">Logouts</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="enrollment">Enrollments</SelectItem>
              <SelectItem value="content_view">Content Views</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={refreshActivityLog}
            disabled={isLoading}
          >
            <RotateCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            Recent user activity across the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredActivities.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredActivities.map((activity) => (
                  <TableRow key={activity.id}>
                    <TableCell>
                      <Badge className={getActivityBadgeColor(activity.activity_type)}>
                        {activity.activity_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {activity.resource_type ? (
                        <span className="flex items-center">
                          {activity.resource_type}
                          {activity.resource_id && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 ml-1"
                              asChild
                            >
                              <a href={`/admin/${activity.resource_type}s/${activity.resource_id}`} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            </Button>
                          )}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="flex items-center text-sm text-muted-foreground">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {formatDate(activity.created_at)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {activity.ip_address && (
                        <span className="text-xs text-muted-foreground block">
                          IP: {activity.ip_address}
                        </span>
                      )}
                      {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-xs"
                          onClick={() => {
                            console.log('Metadata:', activity.metadata);
                            // In a real app, you might show this in a modal
                            alert(JSON.stringify(activity.metadata, null, 2));
                          }}
                        >
                          View Details
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No activity records found
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
