'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Info } from 'lucide-react';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from '@/components/ui/button';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export type LicenseType = 'CUR' | 'PLR' | 'BUNDLE' | 'UNKNOWN';

interface LicenseTermsProps {
  minimal?: boolean;
  variant?: 'hover' | 'popover' | 'inline';
  licenseType?: LicenseType;
  className?: string;
  isPublic?: boolean; // Added prop
}

// ... existing helper function ...
export const getLicenseTypeFromTitle = (title: string | null): LicenseType => {
  if (!title) return 'UNKNOWN';

  if (title.includes('(CUR)')) return 'CUR';
  if (title.includes('(PLR)')) return 'PLR';

  // If no specific license indicator is found, assume it's a bundle
  return 'BUNDLE';
};

const LicenseTerms: React.FC<LicenseTermsProps> = ({
  minimal = false,
  variant = 'hover',
  licenseType = 'BUNDLE',
  className = '',
  isPublic = false
}) => {

  // Public License Content
  const publicLicenseContent = (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-primary text-base">LICENSE AGREEMENT</h3>
        <p className="text-sm text-muted-foreground mb-4">
          This template from Graceful Homeschooling may be used to create physical end-products for sale.
        </p>

        <ul className="space-y-3 text-sm">
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>You may use these digital files for personal projects, educational materials, and commercial projects.</span>
          </li>
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>You are allowed to print and sell the physical products for profit.</span>
          </li>
          <li className="flex items-start">
            <X className="h-4 w-4 text-destructive mt-0.5 mr-2 flex-shrink-0" />
            <span>However, you may <strong>NOT</strong> resell, distribute, or share the digital files in any form.</span>
          </li>
        </ul>

        <p className="text-sm font-semibold mt-4 text-primary">COMMERCIAL USE: FOR PHYSICAL END-PRODUCTS ONLY.</p>
      </div>
    </div>
  );

  // CUR License Content
  const curLicenseContent = (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-primary text-base">Commercial Use Rights (CUR) License</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Products with CUR license allow you to:
        </p>

        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Right to resell as physical and/or digital products</span>
          </li>
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>End-users can create physical end-products for sale</span>
          </li>
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Use on unlimited products you sell</span>
          </li>
          {!minimal && (
            <>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>Create derivative works for your own use</span>
              </li>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>Use in both digital and print products</span>
              </li>
            </>
          )}
        </ul>

        {!minimal && (
          <>
            <p className="text-sm text-muted-foreground mt-4 mb-2">License restrictions:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <X className="h-4 w-4 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                <span>Reselling or redistributing the design files themselves</span>
              </li>
              <li className="flex items-start">
                <X className="h-4 w-4 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                <span>Removing the owner's name and copyright</span>
              </li>
              <li className="flex items-start">
                <X className="h-4 w-4 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                <span>Granting end-users rights to resell digital products</span>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  );

  // PLR License Content
  const plrLicenseContent = (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-primary text-base">Private Label Rights (PLR) License</h3>
        <p className="text-sm text-muted-foreground mb-2">
          Products with PLR license provide enhanced permissions:
        </p>

        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Right to resell as physical and/or digital products</span>
          </li>
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Modify and rebrand the product as your own</span>
          </li>
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Remove owner&apos;s name and copyright</span>
          </li>
          {!minimal && (
            <>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>Modify and sell as your own designs</span>
              </li>
              <li className="flex items-start">
                <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
                <span>Include in membership sites you manage</span>
              </li>
            </>
          )}
        </ul>

        {!minimal && (
          <>
            <p className="text-sm text-muted-foreground mt-4 mb-2">License restrictions:</p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <X className="h-4 w-4 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                <span>Reselling the unmodified original files</span>
              </li>
              <li className="flex items-start">
                <X className="h-4 w-4 text-destructive mt-0.5 mr-2 flex-shrink-0" />
                <span>Using in products that compete directly with Papers to Profits</span>
              </li>
            </ul>
          </>
        )}
      </div>
    </div>
  );

  // Bundle License Explanation
  const bundleLicenseContent = (
    <div>
      <p className="text-sm text-muted-foreground mb-4">
        This product is a bundle that may contain both Commercial Use Rights (CUR) and Private Label Rights (PLR) materials.
        Please check the individual components within the bundle to determine their specific license type.
      </p>

      <Tabs defaultValue="cur" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="cur">CUR License</TabsTrigger>
          <TabsTrigger value="plr">PLR License</TabsTrigger>
        </TabsList>
        <TabsContent value="cur" className="pt-4">
          {curLicenseContent}
        </TabsContent>
        <TabsContent value="plr" className="pt-4">
          {plrLicenseContent}
        </TabsContent>
      </Tabs>
    </div>
  );

  // Determine which license content to display
  const getLicenseContent = () => {
    if (isPublic) return publicLicenseContent; // Override for public products

    switch (licenseType) {
      case 'CUR':
        return curLicenseContent;
      case 'PLR':
        return plrLicenseContent;
      case 'BUNDLE':
        return bundleLicenseContent;
      default:
        return curLicenseContent; // Default to CUR as a fallback
    }
  };

  // Different display variants
  if (variant === 'inline') {
    return (
      <div className="bg-muted/30 p-4 rounded-lg border">
        {getLicenseContent()}
      </div>
    );
  }

  if (variant === 'popover') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Info className="h-3.5 w-3.5" />
            <span>License Terms</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          {getLicenseContent()}
        </PopoverContent>
      </Popover>
    );
  }

  // Check if we're on a touch device
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Simple detection for touch devices
    const touchDevice = ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      // Modern browsers use maxTouchPoints
      (typeof window !== 'undefined' && 'matchMedia' in window &&
        window.matchMedia('(hover: none), (pointer: coarse)').matches);
    setIsTouch(touchDevice);
  }, []);

  // Use Popover for touch devices (better mobile UX) and HoverCard for desktop
  if (isTouch) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="link" size="sm" className={`gap-1.5 px-0 text-muted-foreground ${className}`}>
            <Info className="h-3.5 w-3.5" />
            <span>
              {isPublic
                ? 'License Agreement'
                : licenseType === 'BUNDLE'
                  ? 'Bundle License Info'
                  : licenseType === 'PLR'
                    ? 'PLR License Info'
                    : 'CUR License Info'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 max-w-[calc(100vw-2rem)]" align="center" sideOffset={5}>
          {getLicenseContent()}
        </PopoverContent>
      </Popover>
    );
  } else {
    // Default hover card display for non-touch devices
    return (
      <HoverCard>
        <HoverCardTrigger asChild>
          <Button variant="link" size="sm" className={`gap-1.5 px-0 text-muted-foreground ${className}`}>
            <Info className="h-3.5 w-3.5" />
            <span>
              {isPublic
                ? 'License Agreement'
                : licenseType === 'BUNDLE'
                  ? 'Bundle License Info'
                  : licenseType === 'PLR'
                    ? 'PLR License Info'
                    : 'CUR License Info'}
            </span>
          </Button>
        </HoverCardTrigger>
        <HoverCardContent className="w-80">
          {getLicenseContent()}
        </HoverCardContent>
      </HoverCard>
    );
  }
};

export default LicenseTerms; 