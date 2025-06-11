'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { FraudRiskLevel } from '@/types/admin/fraud-notification';
import { AdminFraudFlagListItem, FraudFlagItem } from '@/types/admin/affiliate';
import { AlertTriangle, CheckCircle2, MoreVertical, Calendar, UserCircle, CircleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { resolveFraudFlag } from '@/lib/actions/admin/fraud-actions';
import { toast } from 'sonner';
// Remove server action import which was causing the issue

interface FraudFlagWithRisk extends AdminFraudFlagListItem {
  risk?: {
    level: FraudRiskLevel;
    score: number;
    factors: string[];
  };
}

interface FraudFlagsListProps {
  flags: FraudFlagWithRisk[];
  onFlagResolved?: () => void;
}

export function FraudFlagsList({ flags = [], onFlagResolved }: FraudFlagsListProps) {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  
  // Sort flags by risk level (high to low) and creation date (newest first)
  const sortedFlags = [...flags].sort((a, b) => {
    // First by risk level
    const riskOrder = { high: 3, medium: 2, low: 1 };
    const getRiskValue = (flag: FraudFlagWithRisk) => 
      flag.risk?.level ? riskOrder[flag.risk.level] || 0 : 0;
    
    const riskDiff = getRiskValue(b) - getRiskValue(a);
    
    if (riskDiff !== 0) return riskDiff;
    
    // Then by creation date (newest first)
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });
  
  const handleResolveFlag = async (flagId: string, notes: string = '') => {
    setLoadingStates(prev => ({ ...prev, [flagId]: true }));
    try {
      const result = await resolveFraudFlag({
        flagId,
        resolutionNotes: notes || 'Resolved by admin',
        resolvedById: undefined // This is optional and will be retrieved from session in the server action
      });
      
      if (result.success) {
        toast.success('Fraud flag resolved successfully');
        if (onFlagResolved) onFlagResolved();
      } else {
        toast.error(result.error || 'Failed to resolve flag');
      }
    } catch (error) {
      console.error('Error resolving fraud flag:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoadingStates(prev => ({ ...prev, [flagId]: false }));
    }
  };
  
  const getRiskLevelColor = (level: FraudRiskLevel) => {
    switch (level) {
      case 'high':
        return 'bg-red-600 text-white border-red-700';
      case 'medium':
        return 'bg-orange-500 text-white border-orange-600';
      case 'low':
        return 'bg-yellow-400 text-black border-yellow-500';
      default:
        return 'bg-gray-500 text-white border-gray-600';
    }
  };
  
  if (flags.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Fraud Flags</CardTitle>
          <CardDescription>No fraud flags found for this affiliate</CardDescription>
        </CardHeader>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Fraud Flags ({flags.length})
        </CardTitle>
        <CardDescription>
          Active fraud flags and their risk assessments for this affiliate
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {sortedFlags.map((flag) => (
            <AccordionItem key={flag.id} value={flag.id}>
              <AccordionTrigger className="hover:bg-muted/50 px-3 rounded-md">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getRiskLevelColor(flag.risk?.level || 'low')}`}>
                      {flag.risk?.level ? (flag.risk.level.charAt(0).toUpperCase() + flag.risk.level.slice(1)) : 'Low'} Risk
                    </Badge>
                    <span className="font-medium">{flag.reason}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(flag.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="border-l-2 border-muted ml-3 pl-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Created: {format(new Date(flag.created_at), 'PPpp')}</span>
                    </div>
                    {/* Admin who created the flag would be shown here if available */}
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Risk Factors:</h4>
                    <div className="flex flex-wrap gap-2">
                      {flag.risk?.factors ? flag.risk.factors.map((factor, idx) => (
                        <Badge key={idx} variant="outline" className="bg-muted/50">
                          {factor}
                        </Badge>
                      )) : (
                        <Badge variant="outline" className="bg-muted/50">No risk factors</Badge>
                      )}
                    </div>
                  </div>
                  
                  {flag.details && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Details:</h4>
                      <div className="text-sm bg-muted/30 p-3 rounded-md">
                        {typeof flag.details === 'object' 
                          ? flag.details.notes || JSON.stringify(flag.details, null, 2)
                          : String(flag.details)}
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="gap-1 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                      onClick={() => handleResolveFlag(flag.id)}
                      disabled={loadingStates[flag.id] || flag.resolved}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {loadingStates[flag.id] ? 'Resolving...' : flag.resolved ? 'Resolved' : 'Resolve Flag'}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
      <CardFooter className="flex justify-between border-t pt-4">
        <div className="text-sm text-muted-foreground">
          Total flags: {flags.length}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-red-600" />
            <span className="text-xs">High Risk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-orange-500" />
            <span className="text-xs">Medium Risk</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full bg-yellow-400" />
            <span className="text-xs">Low Risk</span>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}
