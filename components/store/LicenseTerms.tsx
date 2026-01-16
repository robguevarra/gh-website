'use client';

import React, { useState, useEffect } from 'react';
import { Check, X, Info, ShieldCheck } from 'lucide-react';
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
  isPublic?: boolean;
}

export const getLicenseTypeFromTitle = (title: string | null): LicenseType => {
  if (!title) return 'UNKNOWN';
  if (title.includes('(CUR)')) return 'CUR';
  if (title.includes('(PLR)')) return 'PLR';
  return 'BUNDLE';
};

const LicenseTerms: React.FC<LicenseTermsProps> = ({
  minimal = false,
  variant = 'hover',
  licenseType = 'BUNDLE',
  className = '',
  isPublic = false
}) => {

  // UPDATED Public License Content
  const publicLicenseContent = minimal ? (
    // Condensed Version (for Hover/Popover)
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold text-primary text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" />
          License Overview
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Commercial usage is allowed for physical end-products.
        </p>

        <ul className="space-y-2 text-sm">
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Produce & sell <strong>physical</strong> end-products.</span>
          </li>
          <li className="flex items-start">
            <Check className="h-4 w-4 text-green-500 mt-0.5 mr-2 flex-shrink-0" />
            <span>Use for personal or business projects.</span>
          </li>
          <li className="flex items-start">
            <X className="h-4 w-4 text-destructive mt-0.5 mr-2 flex-shrink-0" />
            <span><strong>No reselling</strong> or sharing digital files.</span>
          </li>
          <li className="flex items-start">
            <X className="h-4 w-4 text-destructive mt-0.5 mr-2 flex-shrink-0" />
            <span>Canva links must remain private.</span>
          </li>
        </ul>
        <div className="mt-3 pt-3 border-t">
          <p className="text-xs text-muted-foreground italic">See full terms on project page.</p>
        </div>
      </div>
    </div>
  ) : (
    // Full Version (for Inline/Details)
    <div className="grid gap-6 md:grid-cols-2 text-sm text-foreground">

      {/* Friendly Reminder */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-amber-600 font-medium text-base">
          <ShieldCheck className="h-5 w-5" />
          <span>A Friendly Reminder</span>
        </div>
        <p className="leading-relaxed text-muted-foreground">
          To keep things fair and protect the work that went into creating these files, please remember:
        </p>
        <ul className="space-y-2 list-disc pl-4 marker:text-amber-400 text-muted-foreground">
          <li>These files are for your personal or business use to produce physical-end products, but they may not be shared, resold, gifted, or passed on in their original form.</li>
          <li>The illustrations, templates, and Canva links are not to be sold on their own.</li>
          <li>Please don’t upload them to freebie sites, marketplaces, or file-sharing platforms.</li>
          <li>The artwork should not be claimed as your own original creation.</li>
        </ul>
      </div>

      {/* Important Things */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-indigo-600 font-medium text-base">
          <Info className="h-5 w-5" />
          <span>A Few Important Things to Know</span>
        </div>
        <ul className="space-y-2 list-disc pl-4 marker:text-indigo-400 text-muted-foreground">
          <li>This is a digital product, so no physical copy will be sent to you.</li>
          <li>Because the files are delivered instantly, all sales are final.</li>
          <li>Once access is given, we’re unable to offer refunds, exchanges, or cancellations.</li>
          <li>You’ll need your own Canva Pro account to open and edit the Canva files.</li>
        </ul>
        <p className="pt-4 italic text-muted-foreground/80">
          Thank you so much for respecting these guidelines and for supporting our creative work, we’re excited to see what you create with these! ✨
        </p>
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
    if (isPublic) return publicLicenseContent;

    switch (licenseType) {
      case 'CUR':
        return curLicenseContent;
      case 'PLR':
        return plrLicenseContent;
      case 'BUNDLE':
        return bundleLicenseContent;
      default:
        return curLicenseContent;
    }
  };

  // Different display variants
  if (variant === 'inline') {
    return (
      <div className={`rounded-xl border ${isPublic ? 'border-dashed bg-muted/30 p-8' : 'border-border bg-muted/30 p-4'} ${className}`}>
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
    const touchDevice = ('ontouchstart' in window) ||
      (navigator.maxTouchPoints > 0) ||
      (typeof window !== 'undefined' && 'matchMedia' in window &&
        window.matchMedia('(hover: none), (pointer: coarse)').matches);
    setIsTouch(touchDevice);
  }, []);

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