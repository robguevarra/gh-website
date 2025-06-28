'use client';

import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Check } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface WelcomeStoreModalProps {
  /**
   * How many days the modal should remain hidden after viewing
   * Default: 30 days
   */
  hideForDays?: number;
  /**
   * Optional storage key, useful for testing
   * Default: 'welcome-store-modal-viewed'
   */
  storageKey?: string;
}

/**
 * A modal that appears once per session for first-time visitors
 * Follows e-commerce best practices by:
 * - Highlighting key value proposition
 * - Providing quick navigation options
 * - Being dismissible and infrequent
 */
const WelcomeStoreModal: React.FC<WelcomeStoreModalProps> = ({
  hideForDays = 30,
  storageKey = 'welcome-store-modal-viewed'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if modal was previously shown
    const checkViewStatus = () => {
      const viewData = localStorage.getItem(storageKey);
      
      if (viewData) {
        const { timestamp } = JSON.parse(viewData);
        const hideUntil = timestamp + (hideForDays * 24 * 60 * 60 * 1000);
        const now = Date.now();
        
        if (now < hideUntil) {
          return false; // Still within hide period
        }
      }
      return true; // Show modal
    };
    
    // Set initial visibility with a slight delay for better user experience
    const timer = setTimeout(() => {
      setIsOpen(checkViewStatus());
    }, 2000); // Delayed to avoid immediate modal on page load
    
    return () => clearTimeout(timer);
  }, [hideForDays, storageKey]);
  
  const handleDialogClose = () => {
    // Record view time in localStorage
    localStorage.setItem(
      storageKey, 
      JSON.stringify({ timestamp: Date.now() })
    );
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">Welcome to the Commercial License Store</DialogTitle>
          <DialogDescription>
            Elevate your paper products business with our professionally designed commercial licenses
          </DialogDescription>
        </DialogHeader>
        
        <div className="relative h-40 my-2 overflow-hidden rounded-md">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 z-10"></div>
          <Image 
            src="/store-banner.png" 
            alt="Welcome to the store"
            fill
            style={{ objectFit: 'cover' }}
            className="object-center"
          />
        </div>
        
        <div className="grid gap-2">
          <div className="flex gap-2 items-start">
            <span className="bg-primary/10 p-1 rounded-full text-primary">
              <Check size={16} />
            </span>
            <p className="text-sm text-muted-foreground">Ready-to-use commercial designs for your paper product business</p>
          </div>
          <div className="flex gap-2 items-start">
            <span className="bg-primary/10 p-1 rounded-full text-primary">
              <Check size={16} />
            </span>
            <p className="text-sm text-muted-foreground">Premium CUR and PLR licenses with clear usage terms</p>
          </div>
          <div className="flex gap-2 items-start">
            <span className="bg-primary/10 p-1 rounded-full text-primary">
              <Check size={16} />
            </span>
            <p className="text-sm text-muted-foreground">Regularly updated with fresh designs based on market trends</p>
          </div>
        </div>
        
        <DialogFooter className="sm:justify-between gap-2 flex-col sm:flex-row">
          <Button onClick={handleDialogClose}>Get Started</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WelcomeStoreModal;
