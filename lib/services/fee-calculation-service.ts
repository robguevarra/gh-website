/**
 * Fee Calculation Service
 * 
 * This service handles all fee calculations for affiliate payouts including:
 * - Xendit disbursement fees
 * - Payment method specific fees
 * - Commission tier-based calculations
 * - Fee breakdown and reporting
 */

// Fee calculation interfaces
export interface FeeBreakdown {
  gross_amount: number;
  base_fee: number;
  percentage_fee: number;
  total_fees: number;
  net_amount: number;
  fee_percentage: number;
  payment_method: string;
  tier_multiplier?: number;
}

export interface CommissionTierInfo {
  tier_name: string;
  commission_rate: number;
  fee_discount?: number; // Percentage discount on fees for higher tiers
  minimum_payout?: number;
}

export interface PayoutFeeStructure {
  payment_method: string;
  base_fee: number; // Fixed fee in IDR
  percentage_fee: number; // Percentage of amount (0.001 = 0.1%)
  minimum_fee?: number;
  maximum_fee?: number;
  currency: string;
}

class FeeCalculationService {
  // Default fee structures based on Xendit pricing (as of 2024)
  private readonly FEE_STRUCTURES: Record<string, PayoutFeeStructure> = {
    bank_transfer: {
      payment_method: 'bank_transfer',
      base_fee: 4000, // IDR 4,000
      percentage_fee: 0.001, // 0.1%
      minimum_fee: 4000,
      maximum_fee: 25000, // IDR 25,000
      currency: 'IDR',
    },
    ewallet_ovo: {
      payment_method: 'ewallet_ovo',
      base_fee: 2500, // IDR 2,500
      percentage_fee: 0.007, // 0.7%
      minimum_fee: 2500,
      currency: 'IDR',
    },
    ewallet_dana: {
      payment_method: 'ewallet_dana',
      base_fee: 2500, // IDR 2,500
      percentage_fee: 0.007, // 0.7%
      minimum_fee: 2500,
      currency: 'IDR',
    },
    ewallet_gopay: {
      payment_method: 'ewallet_gopay',
      base_fee: 2500, // IDR 2,500
      percentage_fee: 0.007, // 0.7%
      minimum_fee: 2500,
      currency: 'IDR',
    },
  };

  // Commission tier configurations
  private readonly COMMISSION_TIERS: Record<string, CommissionTierInfo> = {
    bronze: {
      tier_name: 'Bronze',
      commission_rate: 0.15, // 15%
      fee_discount: 0, // No discount
      minimum_payout: 50000, // IDR 50,000
    },
    silver: {
      tier_name: 'Silver',
      commission_rate: 0.20, // 20%
      fee_discount: 0.1, // 10% fee discount
      minimum_payout: 40000, // IDR 40,000
    },
    gold: {
      tier_name: 'Gold',
      commission_rate: 0.25, // 25%
      fee_discount: 0.15, // 15% fee discount
      minimum_payout: 30000, // IDR 30,000
    },
    platinum: {
      tier_name: 'Platinum',
      commission_rate: 0.30, // 30%
      fee_discount: 0.20, // 20% fee discount
      minimum_payout: 25000, // IDR 25,000
    },
  };

  /**
   * Calculate fees for a single payout
   */
  calculatePayoutFees({
    amount,
    paymentMethod = 'bank_transfer',
    tierName,
  }: {
    amount: number;
    paymentMethod?: string;
    tierName?: string;
  }): FeeBreakdown {
    const feeStructure = this.FEE_STRUCTURES[paymentMethod] || this.FEE_STRUCTURES.bank_transfer;
    const tierInfo = tierName ? this.COMMISSION_TIERS[tierName.toLowerCase()] : null;

    // Calculate base fees
    const baseFee = feeStructure.base_fee;
    const percentageFee = Math.round(amount * feeStructure.percentage_fee);
    
    // Calculate total fees before any discounts
    let totalFees = Math.max(baseFee, percentageFee);
    
    // Apply tier-based fee discount if applicable
    let tierMultiplier = 1;
    if (tierInfo && tierInfo.fee_discount) {
      tierMultiplier = 1 - tierInfo.fee_discount;
      totalFees = Math.round(totalFees * tierMultiplier);
    }

    // Apply minimum and maximum fee limits
    if (feeStructure.minimum_fee) {
      totalFees = Math.max(totalFees, feeStructure.minimum_fee);
    }
    if (feeStructure.maximum_fee) {
      totalFees = Math.min(totalFees, feeStructure.maximum_fee);
    }

    const netAmount = amount - totalFees;
    const feePercentage = amount > 0 ? (totalFees / amount) * 100 : 0;

    return {
      gross_amount: amount,
      base_fee: baseFee,
      percentage_fee: percentageFee,
      total_fees: totalFees,
      net_amount: netAmount,
      fee_percentage: feePercentage,
      payment_method: paymentMethod,
      tier_multiplier: tierMultiplier,
    };
  }

  /**
   * Calculate fees for multiple payouts (batch processing)
   */
  calculateBatchFees({
    payouts,
    paymentMethod = 'bank_transfer',
  }: {
    payouts: Array<{
      amount: number;
      affiliate_tier?: string;
    }>;
    paymentMethod?: string;
  }): {
    individual_fees: FeeBreakdown[];
    batch_totals: {
      total_gross_amount: number;
      total_fees: number;
      total_net_amount: number;
      average_fee_percentage: number;
      payout_count: number;
    };
  } {
    const individualFees = payouts.map(payout =>
      this.calculatePayoutFees({
        amount: payout.amount,
        paymentMethod,
        tierName: payout.affiliate_tier,
      })
    );

    const batchTotals = {
      total_gross_amount: individualFees.reduce((sum, fee) => sum + fee.gross_amount, 0),
      total_fees: individualFees.reduce((sum, fee) => sum + fee.total_fees, 0),
      total_net_amount: individualFees.reduce((sum, fee) => sum + fee.net_amount, 0),
      average_fee_percentage: 0,
      payout_count: payouts.length,
    };

    // Calculate average fee percentage
    if (batchTotals.total_gross_amount > 0) {
      batchTotals.average_fee_percentage = (batchTotals.total_fees / batchTotals.total_gross_amount) * 100;
    }

    return {
      individual_fees: individualFees,
      batch_totals: batchTotals,
    };
  }

  /**
   * Get commission rate for a specific tier
   */
  getCommissionRate(tierName: string): number {
    const tier = this.COMMISSION_TIERS[tierName.toLowerCase()];
    return tier ? tier.commission_rate : this.COMMISSION_TIERS.bronze.commission_rate;
  }

  /**
   * Get minimum payout amount for a specific tier
   */
  getMinimumPayout(tierName: string): number {
    const tier = this.COMMISSION_TIERS[tierName.toLowerCase()];
    return tier ? tier.minimum_payout || 50000 : 50000; // Default to 50k IDR
  }

  /**
   * Check if payout amount meets minimum requirements
   */
  validatePayoutAmount({
    amount,
    tierName,
    paymentMethod = 'bank_transfer',
  }: {
    amount: number;
    tierName?: string;
    paymentMethod?: string;
  }): {
    isValid: boolean;
    minimumRequired: number;
    shortfall?: number;
    errors: string[];
  } {
    const errors: string[] = [];
    const minimumRequired = tierName ? this.getMinimumPayout(tierName) : 50000;

    // Check minimum payout amount
    if (amount < minimumRequired) {
      errors.push(`Amount ${amount.toLocaleString('id-ID')} IDR is below minimum payout of ${minimumRequired.toLocaleString('id-ID')} IDR`);
    }

    // Check if amount is positive
    if (amount <= 0) {
      errors.push('Payout amount must be positive');
    }

    // Calculate fees to ensure net amount is reasonable
    const feeBreakdown = this.calculatePayoutFees({ amount, paymentMethod, tierName });
    if (feeBreakdown.net_amount <= 0) {
      errors.push('Payout amount is too low - fees exceed the payout amount');
    }

    // Check if fee percentage is reasonable (warn if > 50%)
    if (feeBreakdown.fee_percentage > 50) {
      errors.push(`Warning: Fees (${feeBreakdown.fee_percentage.toFixed(2)}%) are unusually high for this payout amount`);
    }

    return {
      isValid: errors.length === 0,
      minimumRequired,
      shortfall: amount < minimumRequired ? minimumRequired - amount : undefined,
      errors,
    };
  }

  /**
   * Get all available payment methods with their fee structures
   */
  getAvailablePaymentMethods(): PayoutFeeStructure[] {
    return Object.values(this.FEE_STRUCTURES);
  }

  /**
   * Get all available commission tiers
   */
  getAvailableCommissionTiers(): CommissionTierInfo[] {
    return Object.values(this.COMMISSION_TIERS);
  }

  /**
   * Calculate commission amount based on purchase and tier
   */
  calculateCommission({
    purchaseAmount,
    tierName,
    customRate,
  }: {
    purchaseAmount: number;
    tierName?: string;
    customRate?: number;
  }): {
    commission_amount: number;
    commission_rate: number;
    tier_name?: string;
  } {
    const commissionRate = customRate || (tierName ? this.getCommissionRate(tierName) : this.COMMISSION_TIERS.bronze.commission_rate);
    const commissionAmount = Math.round(purchaseAmount * commissionRate);

    return {
      commission_amount: commissionAmount,
      commission_rate: commissionRate,
      tier_name: tierName,
    };
  }

  /**
   * Format currency amounts for display
   */
  formatCurrency(amount: number, currency: string = 'IDR'): string {
    if (currency === 'IDR') {
      return `Rp ${amount.toLocaleString('id-ID')}`;
    }
    return `${amount.toLocaleString('en-US')} ${currency}`;
  }

  /**
   * Get fee summary for reporting
   */
  getFeeSummary({
    payouts,
    paymentMethod = 'bank_transfer',
  }: {
    payouts: Array<{
      amount: number;
      affiliate_tier?: string;
    }>;
    paymentMethod?: string;
  }): {
    total_gross: string;
    total_fees: string;
    total_net: string;
    average_fee_rate: string;
    fee_breakdown_by_tier: Record<string, {
      count: number;
      total_gross: number;
      total_fees: number;
      average_fee_rate: number;
    }>;
  } {
    const calculation = this.calculateBatchFees({ payouts, paymentMethod });
    
    // Group by tier for breakdown
    const tierBreakdown: Record<string, {
      count: number;
      total_gross: number;
      total_fees: number;
      average_fee_rate: number;
    }> = {};

    calculation.individual_fees.forEach((fee, index) => {
      const tier = payouts[index].affiliate_tier || 'bronze';
      if (!tierBreakdown[tier]) {
        tierBreakdown[tier] = {
          count: 0,
          total_gross: 0,
          total_fees: 0,
          average_fee_rate: 0,
        };
      }
      tierBreakdown[tier].count++;
      tierBreakdown[tier].total_gross += fee.gross_amount;
      tierBreakdown[tier].total_fees += fee.total_fees;
    });

    // Calculate average fee rates for each tier
    Object.keys(tierBreakdown).forEach(tier => {
      const breakdown = tierBreakdown[tier];
      breakdown.average_fee_rate = breakdown.total_gross > 0 
        ? (breakdown.total_fees / breakdown.total_gross) * 100 
        : 0;
    });

    return {
      total_gross: this.formatCurrency(calculation.batch_totals.total_gross_amount),
      total_fees: this.formatCurrency(calculation.batch_totals.total_fees),
      total_net: this.formatCurrency(calculation.batch_totals.total_net_amount),
      average_fee_rate: `${calculation.batch_totals.average_fee_percentage.toFixed(2)}%`,
      fee_breakdown_by_tier: tierBreakdown,
    };
  }
}

// Export singleton instance
export const feeCalculationService = new FeeCalculationService();

// Export utility functions
export const FeeUtils = {
  /**
   * Convert percentage to basis points (for precise calculations)
   */
  percentageToBasisPoints(percentage: number): number {
    return Math.round(percentage * 10000);
  },

  /**
   * Convert basis points to percentage
   */
  basisPointsToPercentage(basisPoints: number): number {
    return basisPoints / 10000;
  },

  /**
   * Round to nearest currency unit (for IDR, round to nearest 100)
   */
  roundToCurrencyUnit(amount: number, currency: string = 'IDR'): number {
    if (currency === 'IDR') {
      return Math.round(amount / 100) * 100; // Round to nearest 100 IDR
    }
    return Math.round(amount * 100) / 100; // Round to 2 decimal places for other currencies
  },

  /**
   * Calculate effective fee rate after discounts
   */
  calculateEffectiveFeeRate(baseFeeRate: number, discountPercentage: number): number {
    return baseFeeRate * (1 - discountPercentage);
  },
}; 