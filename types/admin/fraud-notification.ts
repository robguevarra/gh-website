export type FraudRiskLevel = 'low' | 'medium' | 'high';

export interface FraudNotification {
  id: string;
  flag_id: string;
  affiliate_id: string;
  affiliate_name?: string;
  risk_level: FraudRiskLevel;
  reason: string;
  details?: any;
  read: boolean;
  created_at: string;
}

export interface FraudRiskScore {
  score: number;
  level: FraudRiskLevel;
  factors: string[];
}
