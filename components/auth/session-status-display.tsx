'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useEnhancedAuth } from '@/context/enhanced-auth-context';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Shield, AlertTriangle, Clock } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';

export function SessionStatusDisplay() {
  const { 
    user, 
    roles, 
    refreshSession, 
    getRemainingSessionTime, 
    isLoading 
  } = useEnhancedAuth();
  
  const [remainingTime, setRemainingTime] = useState<number>(getRemainingSessionTime());
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshProgress, setRefreshProgress] = useState<number>(0);
  
  // Percentage of session time remaining
  const sessionPercentage = Math.max(
    0, 
    Math.min(100, (remainingTime / 3600) * 100)
  );
  
  // Format the expiry time
  const expiryTime = new Date(Date.now() + remainingTime * 1000);
  
  // Update the remaining time every 30 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setRemainingTime(getRemainingSessionTime());
    }, 30000);
    
    return () => clearInterval(timer);
  }, [getRemainingSessionTime]);
  
  // Handle session refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshProgress(25);
    
    try {
      // Simulate progress for better UX
      const progressTimer = setInterval(() => {
        setRefreshProgress(prev => Math.min(prev + 25, 90));
      }, 300);
      
      // Attempt to refresh the session
      const success = await refreshSession();
      
      clearInterval(progressTimer);
      setRefreshProgress(100);
      
      if (success) {
        // Update remaining time after successful refresh
        setRemainingTime(getRemainingSessionTime());
        toast.success('Session refreshed successfully');
      } else {
        toast.error('Unable to refresh session');
      }
    } catch (error) {
      toast.error('Error refreshing session');
      console.error('Session refresh error:', error);
    } finally {
      // Reset progress after a delay
      setTimeout(() => {
        setRefreshProgress(0);
        setIsRefreshing(false);
      }, 500);
    }
  };
  
  // Get role badge color
  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'admin':
        return 'bg-red-500 hover:bg-red-600';
      case 'affiliate':
        return 'bg-purple-500 hover:bg-purple-600';
      case 'student':
        return 'bg-blue-500 hover:bg-blue-600';
      case 'guest':
      default:
        return 'bg-gray-500 hover:bg-gray-600';
    }
  };
  
  // Get status color based on remaining time
  const getStatusColor = (): string => {
    if (remainingTime > 1800) { // Over 30 minutes
      return 'text-green-500';
    } else if (remainingTime > 600) { // Over 10 minutes
      return 'text-amber-500';
    } else {
      return 'text-red-500';
    }
  };
  
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto animate-pulse">
        <CardHeader>
          <div className="h-6 w-3/4 bg-muted rounded"></div>
          <div className="h-4 w-1/2 bg-muted rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="h-4 w-full bg-muted rounded"></div>
            <div className="h-4 w-5/6 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (!user) {
    return (
      <Card className="w-full max-w-md mx-auto border-amber-200">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-500 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Not Authenticated
          </CardTitle>
          <CardDescription>You are not currently logged in</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Please sign in to access your session information and protected resources.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span className="flex items-center">
            <Shield className="h-4 w-4 mr-2" />
            Session Status
          </span>
          {sessionPercentage < 30 && (
            <Badge variant="outline" className="text-amber-500 border-amber-500">
              <AlertTriangle className="h-3 w-3 mr-1" /> Expiring soon
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Logged in as <span className="font-medium">{user.email}</span>
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-2">
        <div className="space-y-4">
          {/* Session expiry info */}
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              <span className="text-sm text-muted-foreground">Session expires:</span>
            </div>
            <span className={`font-medium ${getStatusColor()}`}>
              {formatDistance(expiryTime, new Date(), { addSuffix: true })}
            </span>
          </div>
          
          {/* Session progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Session time remaining</span>
              <span>{Math.floor(remainingTime / 60)} minutes</span>
            </div>
            <Progress value={sessionPercentage} className="h-2" />
          </div>
          
          {/* Roles */}
          <div>
            <div className="text-sm text-muted-foreground mb-1">User roles:</div>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <Badge key={role} className={getRoleBadgeColor(role)}>
                  {role.charAt(0).toUpperCase() + role.slice(1)}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="pt-2">
        {refreshProgress > 0 ? (
          <div className="w-full space-y-1">
            <Progress value={refreshProgress} className="h-1" />
            <p className="text-xs text-center text-muted-foreground">
              Refreshing session...
            </p>
          </div>
        ) : (
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="w-full"
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Session
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
