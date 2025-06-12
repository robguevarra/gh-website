import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCcw, 
  XCircle, 
  PauseCircle,
  PlayCircle,
  Flag,
  User,
  UserCheck,
  UserX,
  DollarSign,
  CreditCard,
  Truck,
  Package
} from "lucide-react";

// Generic status type that encompasses all possible statuses
export type AdminStatusType = 
  | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'sent'
  | 'active' | 'inactive' | 'flagged' | 'suspended' | 'blocked'
  | 'approved' | 'rejected' | 'review' | 'draft'
  | 'paid' | 'unpaid' | 'refunded' | 'partial'
  | 'delivered' | 'shipped' | 'in-transit'
  | 'new' | 'open' | 'closed' | 'archived'
  | string; // Allow custom statuses

// Status category for consistent theming
export type StatusCategory = 
  | 'success' | 'pending' | 'processing' | 'warning' | 'error' | 'neutral' | 'info';

interface StatusConfig {
  variant: "default" | "secondary" | "outline" | "destructive";
  icon?: React.ReactNode;
  category: StatusCategory;
  label?: string; // Override display label
}

interface AdminStatusBadgeProps {
  status: AdminStatusType;
  context?: 'payout' | 'affiliate' | 'conversion' | 'user' | 'order' | 'general';
  showIcon?: boolean;
  customConfig?: Partial<StatusConfig>;
  className?: string;
}

/**
 * Universal status badge component for admin interfaces
 * Provides consistent styling and iconography across all admin status displays
 */
export function AdminStatusBadge({ 
  status, 
  context = 'general',
  showIcon = true,
  customConfig,
  className = '' 
}: AdminStatusBadgeProps) {
  let variant: "default" | "secondary" | "outline" | "destructive" = "secondary";
  let icon: React.ReactNode | null = null;
  
  const normalizedStatus = status.toLowerCase();
  
  // Determine styling based on status
  switch (normalizedStatus) {
    case "completed":
    case "sent":
    case "active":
    case "approved":
    case "paid":
    case "cleared":
      variant = "default";
      icon = <CheckCircle className="h-3 w-3" />;
      break;
      
    case "pending":
      variant = "secondary";
      icon = <Clock className="h-3 w-3" />;
      break;
      
    case "processing":
    case "review":
      variant = "outline";
      icon = <RefreshCcw className="h-3 w-3" />;
      break;
      
    case "failed":
    case "rejected":
    case "cancelled":
      variant = "destructive";
      icon = <AlertCircle className="h-3 w-3" />;
      break;
      
    case "flagged":
    case "suspended":
      variant = "destructive";
      icon = <Flag className="h-3 w-3" />;
      break;
      
    case "inactive":
      variant = "secondary";
      icon = <PauseCircle className="h-3 w-3" />;
      break;
      
    default:
      variant = "secondary";
      icon = <Clock className="h-3 w-3" />;
  }

  // Context-specific overrides
  if (context === 'payout' && normalizedStatus === 'sent') {
    // For payouts, 'sent' should display as 'completed'
    const displayStatus = 'Completed';
    return (
      <Badge variant={variant} className={`gap-1 ${className}`}>
        {showIcon && icon}
        {displayStatus}
      </Badge>
    );
  }
  
  if (context === 'affiliate') {
    if (normalizedStatus === 'active') {
      icon = <UserCheck className="h-3 w-3" />;
    } else if (normalizedStatus === 'inactive') {
      icon = <UserX className="h-3 w-3" />;
    }
  }
  
  if (context === 'conversion' && normalizedStatus === 'paid') {
    icon = <DollarSign className="h-3 w-3" />;
  }

  const config = { variant, icon };
  const finalConfig = { ...config, ...customConfig };
  
  // Format the display label
  const displayLabel = finalConfig.label || 
    status.charAt(0).toUpperCase() + status.slice(1).replace(/[-_]/g, ' ');

  return (
    <Badge 
      variant={finalConfig.variant} 
      className={`gap-1 ${className}`}
    >
      {showIcon && finalConfig.icon}
      {displayLabel}
    </Badge>
  );
} 