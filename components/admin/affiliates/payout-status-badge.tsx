import { Badge } from "@/components/ui/badge";
import { PayoutStatusType } from "@/types/admin/affiliate";
import { CheckCircle, Clock, AlertCircle, RefreshCcw } from "lucide-react";

interface PayoutStatusBadgeProps {
  status: PayoutStatusType;
}

/**
 * Component for displaying payout status with appropriate styling
 */
export function PayoutStatusBadge({ status }: PayoutStatusBadgeProps) {
  let variant: "default" | "secondary" | "outline" | "destructive" = "default";
  let icon: React.ReactNode | null = null;
  
  // Normalize status - treat 'sent' as 'completed' for UI display
  const displayStatus = status === 'sent' ? 'completed' : status;

  switch (displayStatus) {
    case "pending":
      variant = "secondary";
      icon = <Clock className="h-3 w-3" />;
      break;
    case "processing":
      variant = "outline";
      icon = <RefreshCcw className="h-3 w-3" />;
      break;
    case "completed":
      variant = "default";
      icon = <CheckCircle className="h-3 w-3" />;
      break;
    case "failed":
      variant = "destructive";
      icon = <AlertCircle className="h-3 w-3" />;
      break;
  }

  return (
    <Badge variant={variant} className="gap-1">
      {icon}
      {displayStatus.charAt(0).toUpperCase() + displayStatus.slice(1)}
    </Badge>
  );
}
