import { getAdminClient } from '@/lib/supabase/admin';

/**
 * Validates affiliate payout eligibility based on admin settings and requirements
 */
export async function validatePayoutEligibility(affiliateId: string, totalAmount: number, payoutMethod: string) {
  const supabase = getAdminClient();
  
  try {
    // Get admin settings
    const { data: settings } = await supabase
      .from('affiliate_program_config')
      .select('*')
      .eq('id', 1)
      .single();
    
    if (!settings) {
      return { isValid: false, errors: ['Unable to load admin settings'] };
    }
    
    const errors: string[] = [];
    
    // Check minimum threshold
    const minThreshold = Number(settings.min_payout_threshold) || 2000;
    if (totalAmount < minThreshold) {
      errors.push(`Amount ₱${totalAmount.toFixed(2)} is below minimum threshold of ₱${minThreshold.toFixed(2)}`);
    }
    
    // Check if payout method is enabled
    const enabledMethods = (settings as any).enabled_payout_methods || ['gcash'];
    if (!enabledMethods.includes(payoutMethod)) {
      errors.push(`${payoutMethod === 'gcash' ? 'GCash' : 'Bank transfer'} payments are currently disabled`);
    }
    
    // Get affiliate payment details
    const { data: affiliate } = await supabase
      .from('affiliates')
      .select(`
        id,
        account_holder_name,
        account_number,
        bank_name,
        gcash_number,
        gcash_name,
        bank_account_verified,
        gcash_verified
      `)
      .eq('id', affiliateId)
      .single();
    
    if (!affiliate) {
      errors.push('Affiliate not found');
      return { isValid: false, errors };
    }
    
    // Validate payment method details
    if (payoutMethod === 'bank_transfer') {
      if (!affiliate.account_holder_name || !affiliate.account_number || !affiliate.bank_name) {
        errors.push('Missing bank account details');
      }
      
      // Check verification requirement
      const requireBankVerification = (settings as any).require_verification_for_bank_transfer ?? true;
      if (requireBankVerification && !affiliate.bank_account_verified) {
        errors.push('Bank account verification required but not completed');
      }
    } else if (payoutMethod === 'gcash') {
      if (!affiliate.gcash_number || !affiliate.gcash_name) {
        errors.push('Missing GCash details');
      }
      
      // Check verification requirement
      const requireGcashVerification = (settings as any).require_verification_for_gcash ?? false;
      if (requireGcashVerification && !affiliate.gcash_verified) {
        errors.push('GCash verification required but not completed');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      details: {
        minThreshold,
        enabledMethods,
                 affiliate: {
           bank: {
             hasDetails: !!(affiliate.account_holder_name && affiliate.account_number && affiliate.bank_name),
             verified: affiliate.bank_account_verified
           },
          gcash: {
            hasDetails: !!(affiliate.gcash_number && affiliate.gcash_name),
            verified: affiliate.gcash_verified
          }
        }
      }
    };
    
  } catch (error) {
    console.error('Error validating payout eligibility:', error);
    return { 
      isValid: false, 
      errors: ['Failed to validate payout eligibility'] 
    };
  }
}

/**
 * Validates a batch of affiliates for payout processing
 */
export async function validatePayoutBatch(affiliates: Array<{
  affiliate_id: string;
  affiliate_name: string;
  affiliate_email: string;
  total_amount: number;
}>, payoutMethod: string) {
  const validationResults = [];
  const errors = [];
  
  for (const affiliate of affiliates) {
    const validation = await validatePayoutEligibility(
      affiliate.affiliate_id,
      affiliate.total_amount,
      payoutMethod
    );
    
    if (!validation.isValid) {
      errors.push(`${affiliate.affiliate_name} (${affiliate.affiliate_email}): ${validation.errors.join(', ')}`);
    } else {
      validationResults.push({
        ...affiliate,
        validation
      });
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    validAffiliates: validationResults,
    summary: {
      total: affiliates.length,
      valid: validationResults.length,
      invalid: errors.length
    }
  };
} 