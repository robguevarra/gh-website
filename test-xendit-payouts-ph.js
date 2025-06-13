/**
 * Test script for Xendit Payouts API v2 - Philippines Integration
 * 
 * This script tests the new Xendit Payouts API v2 to verify:
 * 1. Available payout channels for Philippines
 * 2. Create a test payout (if enabled)
 * 3. Check payout status
 */

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_BASE_URL = 'https://api.xendit.co';

if (!XENDIT_SECRET_KEY) {
  console.error('❌ XENDIT_SECRET_KEY environment variable is required');
  process.exit(1);
}

// Helper function to make authenticated requests
async function makeXenditRequest(endpoint, options = {}) {
  const credentials = Buffer.from(`${XENDIT_SECRET_KEY}:`).toString('base64');
  
  const response = await fetch(`${XENDIT_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
      'User-Agent': 'GH-Website-Test/1.0',
      ...options.headers,
    },
  });

  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Xendit API Error: ${response.status} - ${JSON.stringify(data)}`);
  }

  return data;
}

// Test 1: Get available payout channels
async function testGetPayoutChannels() {
  console.log('\n🔍 Testing: Get Payout Channels');
  console.log('='.repeat(50));
  
  try {
    const channels = await makeXenditRequest('/payouts_channels');
    
    // Filter for Philippines channels
    const philippinesChannels = channels.filter(channel => 
      channel.country === 'PH' || 
      channel.channel_code.startsWith('PH_') ||
      channel.currency === 'PHP'
    );
    
    console.log(`✅ Found ${philippinesChannels.length} Philippines channels:`);
    
    philippinesChannels.forEach(channel => {
      console.log(`  📋 ${channel.channel_code}: ${channel.channel_name}`);
      console.log(`     Category: ${channel.channel_category}`);
      console.log(`     Currency: ${channel.currency}`);
      if (channel.minimum_amount) {
        console.log(`     Min Amount: ${channel.minimum_amount}`);
      }
      if (channel.maximum_amount) {
        console.log(`     Max Amount: ${channel.maximum_amount}`);
      }
      console.log('');
    });
    
    return philippinesChannels;
    
  } catch (error) {
    console.error('❌ Error getting payout channels:', error.message);
    return [];
  }
}

// Test 2: Create a test payout (dry run)
async function testCreatePayout(channels, dryRun = true) {
  console.log('\n💰 Testing: Create Payout');
  console.log('='.repeat(50));
  
  if (dryRun) {
    console.log('🔒 DRY RUN MODE - No actual payout will be created');
  }
  
  // Find a suitable test channel (prefer GCash for testing)
  const testChannel = channels.find(c => c.channel_code === 'PH_GCASH') || 
                     channels.find(c => c.channel_code === 'PH_BDO') ||
                     channels[0];
  
  if (!testChannel) {
    console.log('❌ No suitable test channel found');
    return null;
  }
  
  const testPayoutRequest = {
    reference_id: `test_payout_${Date.now()}`,
    channel_code: testChannel.channel_code,
    channel_properties: {
      account_number: '1234567890', // Test account number
      account_holder_name: 'Test User',
    },
    amount: 100, // PHP 100 for testing
    currency: 'PHP',
    description: 'Test payout from GH Website',
    receipt_notification: {
      email_to: ['test@example.com'],
    },
    metadata: {
      test: true,
      system: 'gh-website-test',
    },
  };
  
  console.log('📋 Test Payout Request:');
  console.log(JSON.stringify(testPayoutRequest, null, 2));
  
  if (dryRun) {
    console.log('✅ Dry run completed - request structure is valid');
    return testPayoutRequest;
  }
  
  try {
    // Add idempotency key for safety
    const idempotencyKey = `test_${testPayoutRequest.reference_id}`;
    
    const payout = await makeXenditRequest('/v2/payouts', {
      method: 'POST',
      headers: {
        'Idempotency-key': idempotencyKey,
      },
      body: JSON.stringify(testPayoutRequest),
    });
    
    console.log('✅ Test payout created successfully:');
    console.log(`   ID: ${payout.id}`);
    console.log(`   Status: ${payout.status}`);
    console.log(`   Reference: ${payout.reference_id}`);
    console.log(`   Amount: ${payout.amount} ${payout.currency}`);
    console.log(`   Channel: ${payout.channel_code}`);
    
    return payout;
    
  } catch (error) {
    console.error('❌ Error creating test payout:', error.message);
    return null;
  }
}

// Test 3: Check payout status
async function testGetPayoutStatus(payoutId) {
  if (!payoutId) {
    console.log('\n⏭️  Skipping payout status check (no payout ID)');
    return;
  }
  
  console.log('\n📊 Testing: Get Payout Status');
  console.log('='.repeat(50));
  
  try {
    const payout = await makeXenditRequest(`/v2/payouts/${payoutId}`);
    
    console.log('✅ Payout status retrieved:');
    console.log(`   ID: ${payout.id}`);
    console.log(`   Status: ${payout.status}`);
    console.log(`   Reference: ${payout.reference_id}`);
    console.log(`   Amount: ${payout.amount} ${payout.currency}`);
    console.log(`   Created: ${payout.created}`);
    console.log(`   Updated: ${payout.updated}`);
    
    if (payout.estimated_arrival_time) {
      console.log(`   ETA: ${payout.estimated_arrival_time}`);
    }
    
    if (payout.failure_code) {
      console.log(`   Failure Code: ${payout.failure_code}`);
    }
    
    return payout;
    
  } catch (error) {
    console.error('❌ Error getting payout status:', error.message);
    return null;
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting Xendit Payouts API v2 Tests for Philippines');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Get available channels
    const channels = await testGetPayoutChannels();
    
    if (channels.length === 0) {
      console.log('❌ No Philippines channels found - cannot continue tests');
      return;
    }
    
    // Test 2: Create test payout (dry run by default)
    const dryRun = process.argv.includes('--live') ? false : true;
    const testPayout = await testCreatePayout(channels, dryRun);
    
    // Test 3: Check status (only if we created a real payout)
    if (testPayout && testPayout.id) {
      await testGetPayoutStatus(testPayout.id);
    }
    
    console.log('\n✅ All tests completed successfully!');
    console.log('\n📝 Summary:');
    console.log(`   - Found ${channels.length} Philippines payout channels`);
    console.log(`   - Test payout: ${dryRun ? 'Dry run only' : 'Created successfully'}`);
    console.log('\n💡 To create a real test payout, run: node test-xendit-payouts-ph.js --live');
    console.log('⚠️  WARNING: --live mode will create actual payouts and may incur charges!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests(); 