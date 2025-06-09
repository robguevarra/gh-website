import React from 'react';
import PageHeader from '@/components/common/page-header';
import { getAllAdminFraudFlags } from '@/lib/actions/affiliate-actions';
import { FraudFlagList } from '@/components/admin/affiliates/fraud-flag-list'; // Corrected import
import { AdminFraudFlagListItem } from '@/types/admin/affiliate'; // Added for typing
import { AlertTriangle } from "lucide-react"; // Added
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Added

export default async function FraudFlagsPage() {
  let fraudFlags: AdminFraudFlagListItem[] = []; // Typed fraudFlags
  let errorFetchingFlags: string | null = null;

  try {
    const result = await getAllAdminFraudFlags();
    // getAllAdminFraudFlags returns {flags: Array, error?: string}
    if (result.error) {
      errorFetchingFlags = result.error;
    } else {
      fraudFlags = result.flags || [];
    }
  } catch (error) {
    console.error("Failed to fetch fraud flags:", error);
    errorFetchingFlags = error instanceof Error ? error.message : "An unknown error occurred.";
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6 lg:px-8">
      <PageHeader 
        title="Affiliate Fraud Flag Management" 
        description="Review and manage all fraud flags detected in the affiliate program." 
      />
      <div className="mt-6">
        {errorFetchingFlags ? (
          <Alert variant="destructive"> {/* Restored Alert component */}
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Fetching Fraud Flags</AlertTitle>
            <AlertDescription>
              There was an issue retrieving the fraud flags: {errorFetchingFlags}
              <br />
              Please try again later or contact support if the issue persists.
            </AlertDescription>
          </Alert>
        ) : (
          <FraudFlagList fraudFlags={fraudFlags} />
        )}
      </div>
    </div>
  );
}
