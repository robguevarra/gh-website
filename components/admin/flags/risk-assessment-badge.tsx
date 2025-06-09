'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { FraudRiskLevel } from '@/types/admin/fraud-notification';

interface RiskAssessmentBadgeProps {
  affiliateId: string;
  highRiskCount: number;
  unresolvedCount: number;
  riskLevel?: FraudRiskLevel;
  className?: string;
}

export function RiskAssessmentBadge({
  affiliateId,
  highRiskCount,
  unresolvedCount,
  riskLevel = 'low',
  className
}: RiskAssessmentBadgeProps) {
  const hasRisk = highRiskCount > 0;
  
  // Style based on risk level
  const getRiskStyles = () => {
    switch(riskLevel) {
      case 'high':
        return {
          badge: 'bg-red-600 text-white hover:bg-red-700',
          icon: <AlertTriangle className="h-4 w-4 mr-1" />,
          label: 'High Risk'
        };
      case 'medium':
        return {
          badge: 'bg-orange-500 text-white hover:bg-orange-600',
          icon: <AlertCircle className="h-4 w-4 mr-1" />,
          label: 'Medium Risk'
        };
      default:
        return hasRisk
          ? {
              badge: 'bg-yellow-400 text-black hover:bg-yellow-500',
              icon: <Info className="h-4 w-4 mr-1" />,
              label: 'Low Risk'
            }
          : {
              badge: 'bg-green-500 text-white hover:bg-green-600',
              icon: <CheckCircle className="h-4 w-4 mr-1" />,
              label: 'No Risk Flags'
            };
    }
  };
  
  const riskStyles = getRiskStyles();
  
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Link href={`/admin/affiliates/fraud-flags?affiliateId=${affiliateId}`} passHref>
            <Button 
              variant="ghost" 
              className={cn(
                "p-2 h-auto flex items-center text-xs font-medium rounded-full",
                riskStyles.badge,
                className
              )}
              size="sm"
            >
              {riskStyles.icon}
              <span className="mr-1">{riskStyles.label}</span>
              {highRiskCount > 0 && (
                <Badge variant="outline" className="ml-1 bg-white/20 text-[10px] h-4 min-w-4 px-1 rounded-full">
                  {highRiskCount}
                </Badge>
              )}
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <div className="text-xs max-w-[200px]">
            <p className="font-medium">Affiliate Risk Assessment</p>
            <p className="mt-1">
              {hasRisk 
                ? `${highRiskCount} high/medium risk flags out of ${unresolvedCount} total unresolved flags` 
                : 'No risk flags detected for this affiliate'}
            </p>
            <p className="mt-1 font-medium flex items-center">
              <ExternalLink className="h-3 w-3 mr-1" />
              Click to view all flags
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
