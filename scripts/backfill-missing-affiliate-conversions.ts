#!/usr/bin/env tsx

/**
 * Backfill Missing Affiliate Conversions
 * 
 * This script identifies paid P2P transactions with affiliate tracking
 * that are missing conversion records and creates them.
 */

import { getAdminClient } from '@/lib/supabase/admin'
import { 
  lookupAffiliateBySlug, 
  findAttributableClick, 
  recordAffiliateConversion 
} from '@/lib/services/affiliate/conversion-service'

interface MissingConversion {
  transaction_id: string
  external_id: string
  contact_email: string
  amount: string
  paid_at: string
  affiliate_slug: string
  visitor_id: string
  affiliate_id: string
}

async function backfillMissingConversions() {
  const supabase = getAdminClient()
  
  console.log('🔍 Finding missing affiliate conversions...')
  
  // Direct query to find paid P2P transactions with affiliate data that don't have conversions
  const { data: fallbackData, error: fallbackError } = await supabase
    .from('transactions')
    .select(`
      id,
      external_id,
      contact_email,
      amount,
      paid_at,
      metadata
    `)
    .eq('transaction_type', 'P2P')
    .eq('status', 'paid')
    .not('metadata->affiliate_slug', 'is', null)
    .gte('paid_at', '2025-08-01')
  
  if (fallbackError) {
    console.error('❌ Query failed:', fallbackError)
    return
  }
  
  console.log(`📊 Found ${fallbackData?.length || 0} paid P2P transactions with affiliate data`)
  
  // Check which ones are missing conversions
  const missing: MissingConversion[] = []
  
  for (const tx of fallbackData || []) {
    const affiliateSlug = (tx.metadata as any)?.affiliate_slug
    const visitorId = (tx.metadata as any)?.visitor_id
    
    if (!affiliateSlug || !visitorId) continue
    
    // Check if conversion exists
    const { data: existingConversion } = await supabase
      .from('affiliate_conversions')
      .select('id')
      .eq('order_id', tx.id)
      .maybeSingle()
    
    if (!existingConversion) {
      // Look up affiliate
      const affiliateId = await lookupAffiliateBySlug({ supabase, slug: affiliateSlug })
      
      if (affiliateId) {
        missing.push({
          transaction_id: tx.id,
          external_id: tx.external_id || '',
          contact_email: tx.contact_email || '',
          amount: String(tx.amount || '0'),
          paid_at: tx.paid_at || '',
          affiliate_slug: affiliateSlug,
          visitor_id: visitorId,
          affiliate_id: affiliateId
        })
      }
    }
  }
  
  console.log(`🚨 Found ${missing.length} missing conversions`)
  
  // Process missing conversions
  for (const missing_conversion of missing) {
    await processMissingConversion(supabase, missing_conversion)
  }
}

async function processMissingConversion(supabase: any, conversion: MissingConversion) {
  console.log(`\n🔧 Processing missing conversion for transaction: ${conversion.transaction_id}`)
  console.log(`   📧 Email: ${conversion.contact_email}`)
  console.log(`   💰 Amount: ₱${conversion.amount}`)
  console.log(`   🏷️  Affiliate: ${conversion.affiliate_slug}`)
  
  try {
    // Find the attributable click
    const { clickId, subId } = await findAttributableClick({
      supabase,
      affiliateId: conversion.affiliate_id,
      visitorId: conversion.visitor_id
    })
    
    console.log(`   🖱️  Click ID: ${clickId || 'Not found'}`)
    
    // Calculate commission (25% for P2P Level 1)
    const gmvAmount = parseFloat(conversion.amount)
    const commissionRate = 0.25 // 25% commission for P2P
    const commissionAmount = gmvAmount * commissionRate
    
    console.log(`   💵 Commission: ₱${commissionAmount.toFixed(2)} (${commissionRate * 100}%)`)
    
    // Record the conversion
    const { success, conversionId, error } = await recordAffiliateConversion({
      supabase,
      conversionData: {
        affiliate_id: conversion.affiliate_id,
        click_id: clickId,
        order_id: conversion.transaction_id,
        gmv: gmvAmount,
        commission_amount: commissionAmount,
        level: 1,
        sub_id: subId
      }
    })
    
    if (success) {
      console.log(`   ✅ Conversion created: ${conversionId}`)
      
      // Update status to 'cleared' since payment is already confirmed
      const { error: updateError } = await supabase
        .from('affiliate_conversions')
        .update({ status: 'cleared' })
        .eq('id', conversionId)
      
      if (updateError) {
        console.log(`   ⚠️  Warning: Could not update status to 'cleared':`, updateError)
      } else {
        console.log(`   ✅ Status updated to 'cleared'`)
      }
      
    } else {
      console.log(`   ❌ Failed to create conversion:`, error?.message)
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing conversion:`, error)
  }
}

async function main() {
  console.log('🚀 Starting affiliate conversion backfill process...')
  
  // Run the backfill
  await backfillMissingConversions()
  
  console.log('\n✅ Backfill process completed!')
  console.log('\n📊 Summary:')
  console.log('   - Checked all paid P2P transactions since August 1st')
  console.log('   - Identified transactions with affiliate tracking but missing conversions')
  console.log('   - Created missing conversion records with proper commission calculations')
  console.log('   - Set status to "cleared" since payments are already confirmed')
}

// Run the script
main().catch(console.error)

export { backfillMissingConversions }
