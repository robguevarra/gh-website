'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShieldAlert } from 'lucide-react';

interface SessionTimeoutAlertProps {
  timeoutMinutes: number;
  onContinue: () => Promise<boolean>;
  onLogout: () => Promise<void>;
  isOpen: boolean;
}

export function SessionTimeoutAlert({
  timeoutMinutes = 1,
  onContinue,
  onLogout,
  isOpen,
}: SessionTimeoutAlertProps) {
  const [open, setOpen] = useState(isOpen);
  const [countdown, setCountdown] = useState(timeoutMinutes * 60);
  const [isLoading, setIsLoading] = useState(false);

  // Format countdown as minutes:seconds
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Start countdown when alert is shown
  useEffect(() => {
    setOpen(isOpen);
    
    if (isOpen) {
      setCountdown(timeoutMinutes * 60);
      
      // Countdown timer
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Auto-logout when countdown reaches 0
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, timeoutMinutes]);

  // Handle continue session
  const handleContinue = async () => {
    setIsLoading(true);
    try {
      const success = await onContinue();
      
      if (success) {
        setOpen(false);
        toast.success('Session extended successfully');
      } else {
        toast.error('Unable to extend session. Please log in again.');
        await handleLogout();
      }
    } catch (error) {
      console.error('Error extending session:', error);
      toast.error('An error occurred while extending your session');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle logout
  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await onLogout();
      setOpen(false);
    } catch (error) {
      console.error('Error during logout:', error);
      toast.error('An error occurred during logout');
      // Force page reload as fallback
      window.location.href = '/auth/signin';
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2 text-amber-500">
            <ShieldAlert className="h-6 w-6" />
            <DialogTitle className="text-amber-500">Session Timeout Warning</DialogTitle>
          </div>
          <DialogDescription>
            Your session is about to expire due to inactivity.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4">
          <p className="text-center text-lg font-semibold">
            Session will expire in: <span className="text-amber-500">{formatTime(countdown)}</span>
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            For security reasons, you will be logged out unless you choose to continue.
          </p>
        </div>
        
        <DialogFooter className="flex flex-row items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleLogout}
            disabled={isLoading}
          >
            Log out now
          </Button>
          <Button
            onClick={handleContinue}
            disabled={isLoading}
          >
            {isLoading ? 'Please wait...' : 'Continue session'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
