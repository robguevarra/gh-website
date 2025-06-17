import { getAdminClient } from '@/lib/supabase/admin';
import { logAdminActivity } from '@/lib/actions/activity-log-actions';


export type GCashVerificationStatus = 
  | 'unverified' 
  | 'pending_documents' 
  | 'pending_review' 
  | 'verified' 
  | 'rejected' 
  | 'expired';

export type GCashVerificationStep = 
  | 'phone_verification'
  | 'id_upload' 
  | 'selfie_upload'
  | 'address_verification'
  | 'admin_review'
  | 'completed';

export interface GCashVerificationData {
  id: string;
  affiliate_id: string;
  status: GCashVerificationStatus;
  current_step: GCashVerificationStep;
  gcash_number: string;
  gcash_name: string;
  
  // Document uploads
  id_document_url?: string;
  id_document_type?: string; // 'drivers_license' | 'passport' | 'umid' | 'postal_id' | 'voters_id'
  selfie_url?: string;
  address_proof_url?: string;
  
  // Verification details
  phone_verified: boolean;
  phone_verification_code?: string;
  phone_verification_expires?: string;
  
  // Admin review
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_reason?: string;
  
  // Timestamps
  submitted_at?: string;
  verified_at?: string;
  expires_at?: string;
  
  created_at: string;
  updated_at: string;
}

/**
 * GCash Verification Service
 * Handles the complete KYC workflow for affiliate GCash accounts
 */
export class GCashVerificationService {
  private supabase = getAdminClient();

  /**
   * Initialize GCash verification for an affiliate
   */
  async initializeVerification(
    affiliateId: string, 
    gcashNumber: string, 
    gcashName: string,
    adminUserId?: string
  ): Promise<{ success: boolean; verificationId?: string; error?: string }> {
    try {
      // Validate GCash number format
      if (!this.isValidGCashNumber(gcashNumber)) {
        return { 
          success: false, 
          error: 'Invalid GCash number format. Must be 09XXXXXXXXX (11 digits starting with 09)' 
        };
      }

      // Check if affiliate already has pending verification
      const { data: existing } = await this.supabase
        .from('gcash_verifications')
        .select('id, status')
        .eq('affiliate_id', affiliateId)
        .in('status', ['pending_documents', 'pending_review'])
        .single();

      if (existing) {
        return { 
          success: false, 
          error: 'Affiliate already has a pending verification request' 
        };
      }

      // Create new verification record
      const { data: verification, error } = await this.supabase
        .from('gcash_verifications')
        .insert({
          affiliate_id: affiliateId,
          status: 'pending_documents',
          current_step: 'phone_verification',
          gcash_number: gcashNumber,
          gcash_name: gcashName,
          phone_verified: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating verification record:', error);
        return { success: false, error: 'Failed to initialize verification' };
      }

      // Update affiliate record
      await this.supabase
        .from('affiliates')
        .update({
          gcash_number: gcashNumber,
          gcash_name: gcashName,
          gcash_verified: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', affiliateId);

      // Log admin activity if initiated by admin
      if (adminUserId) {
        await logAdminActivity({
          admin_user_id: adminUserId,
          action: 'gcash_verification_initiated',
          target_type: 'affiliate',
          target_id: affiliateId,
          details: {
            verification_id: verification.id,
            gcash_number: gcashNumber.replace(/(\d{3})(\d{4})(\d{4})/, '$1****$3'), // Mask middle digits
            gcash_name: gcashName,
          },
        });
      }

      return { success: true, verificationId: verification.id };

    } catch (error) {
      console.error('Error initializing GCash verification:', error);
      return { success: false, error: 'Failed to initialize verification' };
    }
  }

  /**
   * Send phone verification code
   */
  async sendPhoneVerificationCode(verificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Update verification record with code
      const { error } = await this.supabase
        .from('gcash_verifications')
        .update({
          phone_verification_code: code,
          phone_verification_expires: expiresAt.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', verificationId);

      if (error) {
        console.error('Error saving verification code:', error);
        return { success: false, error: 'Failed to generate verification code' };
      }

      // TODO: Integrate with SMS service (Twilio, Semaphore, etc.)
      // For now, we'll log the code (in production, this should be sent via SMS)
      console.log(`GCash Verification Code for ${verificationId}: ${code}`);

      return { success: true };

    } catch (error) {
      console.error('Error sending verification code:', error);
      return { success: false, error: 'Failed to send verification code' };
    }
  }

  /**
   * Verify phone number with code
   */
  async verifyPhoneCode(
    verificationId: string, 
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get verification record
      const { data: verification, error: fetchError } = await this.supabase
        .from('gcash_verifications')
        .select('phone_verification_code, phone_verification_expires')
        .eq('id', verificationId)
        .single();

      if (fetchError || !verification) {
        return { success: false, error: 'Verification record not found' };
      }

      // Check if code is expired
      if (new Date() > new Date(verification.phone_verification_expires || 0)) {
        return { success: false, error: 'Verification code has expired' };
      }

      // Check if code matches
      if (verification.phone_verification_code !== code) {
        return { success: false, error: 'Invalid verification code' };
      }

      // Update verification record
      const { error: updateError } = await this.supabase
        .from('gcash_verifications')
        .update({
          phone_verified: true,
          current_step: 'id_upload',
          phone_verification_code: null, // Clear the code
          phone_verification_expires: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', verificationId);

      if (updateError) {
        console.error('Error updating verification:', updateError);
        return { success: false, error: 'Failed to verify phone number' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error verifying phone code:', error);
      return { success: false, error: 'Failed to verify phone number' };
    }
  }

  /**
   * Upload ID document
   */
  async uploadIdDocument(
    verificationId: string,
    documentUrl: string,
    documentType: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('gcash_verifications')
        .update({
          id_document_url: documentUrl,
          id_document_type: documentType,
          current_step: 'selfie_upload',
          updated_at: new Date().toISOString(),
        })
        .eq('id', verificationId);

      if (error) {
        console.error('Error uploading ID document:', error);
        return { success: false, error: 'Failed to upload ID document' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error uploading ID document:', error);
      return { success: false, error: 'Failed to upload ID document' };
    }
  }

  /**
   * Upload selfie with ID
   */
  async uploadSelfie(
    verificationId: string,
    selfieUrl: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('gcash_verifications')
        .update({
          selfie_url: selfieUrl,
          current_step: 'admin_review',
          status: 'pending_review',
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', verificationId);

      if (error) {
        console.error('Error uploading selfie:', error);
        return { success: false, error: 'Failed to upload selfie' };
      }

      return { success: true };

    } catch (error) {
      console.error('Error uploading selfie:', error);
      return { success: false, error: 'Failed to upload selfie' };
    }
  }

  /**
   * Admin review and approval/rejection
   */
  async reviewVerification(
    verificationId: string,
    adminUserId: string,
    approved: boolean,
    notes?: string,
    rejectionReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const status: GCashVerificationStatus = approved ? 'verified' : 'rejected';
      const currentStep: GCashVerificationStep = approved ? 'completed' : 'admin_review';

      // Update verification record
      const { data: verification, error: updateError } = await this.supabase
        .from('gcash_verifications')
        .update({
          status,
          current_step: currentStep,
          reviewed_by: adminUserId,
          reviewed_at: new Date().toISOString(),
          review_notes: notes,
          rejection_reason: rejectionReason,
          verified_at: approved ? new Date().toISOString() : null,
          expires_at: approved ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() : null, // 1 year
          updated_at: new Date().toISOString(),
        })
        .eq('id', verificationId)
        .select('affiliate_id')
        .single();

      if (updateError || !verification) {
        console.error('Error updating verification:', updateError);
        return { success: false, error: 'Failed to update verification' };
      }

      // Update affiliate record
      if (approved) {
        await this.supabase
          .from('affiliates')
          .update({
            gcash_verified: true,
            gcash_verification_date: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', verification.affiliate_id);
      }

      // Log admin activity
      await logAdminActivity({
        admin_user_id: adminUserId,
        action: approved ? 'gcash_verification_approved' : 'gcash_verification_rejected',
        target_type: 'affiliate',
        target_id: verification.affiliate_id,
        details: {
          verification_id: verificationId,
          notes,
          rejection_reason: rejectionReason,
        },
      });

      return { success: true };

    } catch (error) {
      console.error('Error reviewing verification:', error);
      return { success: false, error: 'Failed to review verification' };
    }
  }

  /**
   * Get verification status for an affiliate
   */
  async getVerificationStatus(affiliateId: string): Promise<GCashVerificationData | null> {
    try {
      const { data, error } = await this.supabase
        .from('gcash_verifications')
        .select('*')
        .eq('affiliate_id', affiliateId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching verification status:', error);
        return null;
      }

      return data || null;

    } catch (error) {
      console.error('Error getting verification status:', error);
      return null;
    }
  }

  /**
   * Get all pending verifications for admin review
   */
  async getPendingVerifications(): Promise<GCashVerificationData[]> {
    try {
      const { data, error } = await this.supabase
        .from('gcash_verifications')
        .select(`
          *,
          affiliates (
            id,
            unified_profiles!affiliates_user_id_fkey (
              email,
              first_name,
              last_name
            )
          )
        `)
        .eq('status', 'pending_review')
        .order('submitted_at', { ascending: true });

      if (error) {
        console.error('Error fetching pending verifications:', error);
        return [];
      }

      return data || [];

    } catch (error) {
      console.error('Error getting pending verifications:', error);
      return [];
    }
  }

  /**
   * Validate GCash number format
   */
  private isValidGCashNumber(gcashNumber: string): boolean {
    // Philippine mobile number format: 09XXXXXXXXX (11 digits starting with 09)
    const gcashRegex = /^09\d{9}$/;
    return gcashRegex.test(gcashNumber);
  }

  /**
   * Check if verification is expired and needs renewal
   */
  async checkExpiredVerifications(): Promise<{ expired: string[]; renewed: number }> {
    try {
      // Find expired verifications
      const { data: expired, error } = await this.supabase
        .from('gcash_verifications')
        .select('id, affiliate_id')
        .eq('status', 'verified')
        .lt('expires_at', new Date().toISOString());

      if (error) {
        console.error('Error checking expired verifications:', error);
        return { expired: [], renewed: 0 };
      }

      if (!expired || expired.length === 0) {
        return { expired: [], renewed: 0 };
      }

      // Mark as expired
      const expiredIds = expired.map(v => v.id);
      const affiliateIds = expired.map(v => v.affiliate_id);

      await this.supabase
        .from('gcash_verifications')
        .update({
          status: 'expired',
          updated_at: new Date().toISOString(),
        })
        .in('id', expiredIds);

      // Update affiliate records
      await this.supabase
        .from('affiliates')
        .update({
          gcash_verified: false,
          updated_at: new Date().toISOString(),
        })
        .in('id', affiliateIds);

      return { expired: expiredIds, renewed: expiredIds.length };

    } catch (error) {
      console.error('Error checking expired verifications:', error);
      return { expired: [], renewed: 0 };
    }
  }
} 