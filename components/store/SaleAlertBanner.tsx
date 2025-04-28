'use client';

import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Link from 'next/link';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SaleAlertBannerProps {
  /**
   * How many days the banner should remain hidden after dismissal
   * Default: 1 day
   */
  hideForDays?: number;
  /**
   * Whether the banner should animate when it appears
   * Default: true
   */
  animate?: boolean;
  /**
   * Optional storage key, useful for showing multiple different banners
   * Default: 'sale-banner-dismissed'
   */
  storageKey?: string;
}

/**
 * A dismissible banner for promoting sales with session storage persistence
 * Industry best practice: Subtle, informative and dismissible
 */
const SaleAlertBanner: React.FC<SaleAlertBannerProps> = ({ 
  hideForDays = 1,
  animate = true,
  storageKey = 'sale-banner-dismissed'
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    // Check if banner was previously dismissed
    const checkDismissalStatus = () => {
      const dismissedData = localStorage.getItem(storageKey);
      
      if (dismissedData) {
        const { timestamp } = JSON.parse(dismissedData);
        const hideUntil = timestamp + (hideForDays * 24 * 60 * 60 * 1000);
        const now = Date.now();
        
        if (now < hideUntil) {
          return false; // Still within hide period
        }
      }
      return true; // Show banner
    };
    
    // Set initial visibility with a slight delay for smooth appearance after page load
    const timer = setTimeout(() => {
      setIsVisible(checkDismissalStatus());
    }, 500);
    
    return () => clearTimeout(timer);
  }, [hideForDays, storageKey]);
  
  const handleDismiss = () => {
    // Record dismissal time in localStorage
    localStorage.setItem(
      storageKey, 
      JSON.stringify({ timestamp: Date.now() })
    );
    setIsVisible(false);
  };
  
  if (!isVisible) return null;
  
  return (
    <div className={`transition-all duration-500 ${animate ? 'animate-fadeIn' : ''}`}>
      <Alert className="bg-rose-50 border-rose-200 relative">
        <AlertDescription className="text-rose-800 text-sm flex items-center justify-between px-4 py-2">
          <div className="flex items-center">
            <span className="font-medium">Limited Time Offer!</span>
            <span className="mx-2 hidden sm:inline">—</span>
            <span className="hidden sm:inline">Get up to 40% off on select commercial licenses</span>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-100">
              <Link href="/dashboard/store?filter=sale">Shop Sale</Link>
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 rounded-full hover:bg-rose-100 p-0" 
              onClick={handleDismiss}
              aria-label="Dismiss sale notification"
            >
              <X className="h-3.5 w-3.5 text-rose-600" />
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SaleAlertBanner;
