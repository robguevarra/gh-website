'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, subDays } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
// Custom date range picker to be implemented
import { Skeleton } from '@/components/ui/skeleton';
import { DateRange } from 'react-day-picker';

import { AlertTriangle, Info, RefreshCw } from 'lucide-react';

// Type definition for the API response
type PasswordResetMetricsResponse = {
  timeframe: {
    interval: string;
    start_date: string;
    end_date: string;
  };
  metrics: {
    total_requests: number;
    successful_resets: number;
    failed_attempts: number;
    expired_links: number;
    conversion_rate: number;
  };
  attempts_by_status: Array<{
    status: string;
    count: number;
  }>;
  attempts_by_time: Array<{
    time_bucket: string;
    attempts: number;
    unique_ips: number;
    unique_emails: number;
  }>;
  potential_security_issues: Array<{
    issue_type: string;
    count: number;
    details: string;
  }>;
};

const formatDate = (dateStr: string) => {
  try {
    return format(new Date(dateStr), 'MMM d, yyyy');
  } catch (e) {
    return dateStr;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800';
    case 'expired':
      return 'bg-amber-100 text-amber-800';
    case 'already_used':
      return 'bg-blue-100 text-blue-800';
    case 'invalid':
      return 'bg-red-100 text-red-800';
    case 'attempted':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getIssueTypeColor = (type: string) => {
  switch (type) {
    case 'rate_limit_exceeded':
      return 'bg-red-100 text-red-800';
    case 'suspicious_ip_activity':
      return 'bg-amber-100 text-amber-800';
    case 'multiple_reset_attempts':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export function PasswordResetMetricsDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PasswordResetMetricsResponse | null>(null);
  const [interval, setInterval] = useState('day');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  
  const fetchMetrics = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      
      if (dateRange?.from) {
        params.set('start_date', dateRange.from.toISOString());
      }
      
      if (dateRange?.to) {
        params.set('end_date', dateRange.to.toISOString());
      }
      
      params.set('interval', interval);
      
      const response = await fetch(`/api/admin/security/password-reset-metrics?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching metrics: ${response.statusText}`);
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch password reset metrics:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch metrics');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch metrics on initial load and when parameters change
  useEffect(() => {
    fetchMetrics();
  }, [interval, dateRange]);
  
  const handleRefresh = () => {
    fetchMetrics();
  };
  
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
  };
  
  const handleIntervalChange = (value: string) => {
    setInterval(value);
  };
  
  // Render loading state
  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Password Reset Security Metrics</h2>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load password reset metrics: {error}
          <div className="mt-4">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Try again
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }
  
  const securityIssueCount = data?.potential_security_issues?.length || 0;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold mb-1">Password Reset Security Metrics</h2>
          <p className="text-muted-foreground">
            {data?.timeframe ? (
              <>
                {formatDate(data.timeframe.start_date)} to {formatDate(data.timeframe.end_date)}
              </>
            ) : 'Last 30 days'}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Date range picker to be implemented - using simple buttons for now */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange({
                from: subDays(new Date(), 7),
                to: new Date()
              })}
            >
              Last 7 days
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange({
                from: subDays(new Date(), 30),
                to: new Date()
              })}
            >
              Last 30 days
            </Button>
          </div>
          
          <Select value={interval} onValueChange={handleIntervalChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Interval" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hour">Hourly</SelectItem>
              <SelectItem value="day">Daily</SelectItem>
              <SelectItem value="week">Weekly</SelectItem>
              <SelectItem value="month">Monthly</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.metrics.total_requests || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Successful Resets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {data?.metrics.successful_resets || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {data?.metrics.failed_attempts || 0}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.metrics.conversion_rate.toFixed(1) || 0}%
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Security alerts */}
      {securityIssueCount > 0 && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800">Security Alerts</AlertTitle>
          <AlertDescription className="text-amber-700">
            Detected {securityIssueCount} potential security {securityIssueCount === 1 ? 'issue' : 'issues'} with password reset requests.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Main content tabs */}
      <Tabs defaultValue="activity">
        <TabsList>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="security">
            Security Issues
            {securityIssueCount > 0 && (
              <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800">
                {securityIssueCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="status">Status Breakdown</TabsTrigger>
        </TabsList>
        
        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Password Reset Activity</CardTitle>
              <CardDescription>
                Activity over time showing total attempts and unique users/IPs
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[350px]">
              {data?.attempts_by_time && data.attempts_by_time.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.attempts_by_time}
                    margin={{ top: 20, right: 30, left: 20, bottom: 70 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="time_bucket" 
                      angle={-45} 
                      textAnchor="end"
                      tick={{ fontSize: 12 }}
                      height={80}
                      tickFormatter={formatDate}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => {
                        return [value, name === 'attempts' 
                          ? 'Total Attempts' 
                          : name === 'unique_ips' 
                            ? 'Unique IPs' 
                            : 'Unique Emails'];
                      }}
                      labelFormatter={formatDate}
                    />
                    <Legend />
                    <Bar 
                      dataKey="attempts" 
                      fill="#8884d8" 
                      name="Total Attempts" 
                    />
                    <Bar 
                      dataKey="unique_ips" 
                      fill="#82ca9d" 
                      name="Unique IPs" 
                    />
                    <Bar 
                      dataKey="unique_emails" 
                      fill="#ffc658" 
                      name="Unique Emails" 
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  No activity data available for this time period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Security Issues Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Potential Security Issues</CardTitle>
              <CardDescription>
                Detected security concerns that may require investigation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.potential_security_issues && data.potential_security_issues.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Issue Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.potential_security_issues.map((issue, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Badge className={getIssueTypeColor(issue.issue_type)}>
                            {issue.issue_type.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{issue.count}</TableCell>
                        <TableCell>{issue.details}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  <Info className="mx-auto h-8 w-8 mb-2" />
                  <p>No security issues detected in the selected time period</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Status Breakdown Tab */}
        <TabsContent value="status">
          <Card>
            <CardHeader>
              <CardTitle>Status Breakdown</CardTitle>
              <CardDescription>
                Password reset attempts by status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {data?.attempts_by_status && data.attempts_by_status.length > 0 ? (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.attempts_by_status}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          dataKey="status" 
                          type="category" 
                          tick={{ fontSize: 12 }}
                          width={80}
                          tickFormatter={(value) => value.replace(/_/g, ' ')}
                        />
                        <Tooltip 
                          formatter={(value) => [value, 'Count']}
                          labelFormatter={(value) => value.replace(/_/g, ' ')}
                        />
                        <Legend />
                        <Bar 
                          dataKey="count" 
                          fill="#8884d8" 
                          name="Attempts" 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Count</TableHead>
                        <TableHead>Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.attempts_by_status.map((status, i) => {
                        const percentage = data.metrics.total_requests > 0
                          ? (status.count / data.metrics.total_requests) * 100
                          : 0;
                          
                        return (
                          <TableRow key={i}>
                            <TableCell>
                              <Badge className={getStatusColor(status.status)}>
                                {status.status.replace(/_/g, ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{status.count}</TableCell>
                            <TableCell>{percentage.toFixed(1)}%</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No status data available for this time period
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <Card>
        <CardHeader>
          <CardTitle>Technical Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This dashboard displays password reset activity metrics and highlights potential security issues.
            The data is collected from our custom password reset flow tracking system, which logs all reset attempts,
            verification processes, and completions. Security issues are identified based on patterns such as
            multiple failed attempts, rate limit breaches, and suspicious IP activity.
          </p>
        </CardContent>
        <CardFooter className="border-t px-6 py-4">
          <div className="flex items-center justify-between w-full text-xs text-muted-foreground">
            <span>Data last refreshed: {isLoading ? 'Refreshing...' : new Date().toLocaleTimeString()}</span>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="mr-2 h-3 w-3" />
              Refresh Data
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
