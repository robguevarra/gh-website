import fetch from 'node-fetch';

async function testProperDisbursement() {
  const apiKey = 'xnd_development_TdjZAA3kaLKviWBuS3VzgpmgdyC1OpIrvxMUTpxVJNF6POAjjQoN3jJg0Ziv';
  const credentials = Buffer.from(`${apiKey}:`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Testing Proper Xendit Disbursement Format...\n');
  
  try {
    // Test 1: Try the new disbursement API format
    console.log('💸 TEST DISBURSEMENT (New API Format):');
    const disbursementData = {
      reference_id: 'test-ph-disbursement-' + Date.now(),
      amount: 100,
      channel_code: 'PH_GCASH',
      account_name: 'Test User',
      account_number: '09123456789', // Try without PH prefix
      description: 'Test Philippines Disbursement'
    };
    
    console.log('Request data:', JSON.stringify(disbursementData, null, 2));
    
    const disbursementResponse = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers,
      body: JSON.stringify(disbursementData)
    });
    
    const responseText = await disbursementResponse.text();
    
    if (disbursementResponse.ok) {
      const disbursement = JSON.parse(responseText);
      console.log(`✅ Status: ${disbursementResponse.status}`);
      console.log('✅ Philippines disbursement created!');
      console.log('Disbursement:', JSON.stringify(disbursement, null, 2));
    } else {
      console.log(`❌ PH Disbursement failed: ${disbursementResponse.status}`);
      console.log(`Error details: ${responseText}`);
      
      // Try to parse the error for better understanding
      try {
        const error = JSON.parse(responseText);
        if (error.errors) {
          console.log('\n📝 Validation Errors:');
          error.errors.forEach(err => {
            console.log(`   - ${err.field}: ${err.messages.join(', ')}`);
          });
        }
      } catch (e) {
        // Ignore JSON parse errors
      }
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Try to get available disbursement channels for Philippines
    console.log('🌏 AVAILABLE DISBURSEMENT CHANNELS:');
    const channelsResponse = await fetch('https://api.xendit.co/disbursement_channels', {
      headers
    });
    
    if (channelsResponse.ok) {
      const channels = await channelsResponse.json();
      console.log(`✅ Status: ${channelsResponse.status}`);
      console.log(`✅ Total channels: ${channels.length}`);
      
      // Look for PH channels
      const phChannels = channels.filter(channel => 
        channel.channel_code?.startsWith('PH_') || 
        channel.country === 'PH' ||
        channel.channel_code?.includes('GCASH')
      );
      
      console.log(`🇵🇭 Philippines channels found: ${phChannels.length}`);
      phChannels.forEach(channel => {
        console.log(`   - ${channel.channel_code}: ${channel.channel_name} (${channel.country})`);
      });
      
      if (phChannels.length === 0) {
        console.log('📝 First 10 available channels:');
        channels.slice(0, 10).forEach(channel => {
          console.log(`   - ${channel.channel_code}: ${channel.channel_name} (${channel.country || 'Unknown'})`);
        });
      }
    } else {
      const errorText = await channelsResponse.text();
      console.log(`❌ Channels failed: ${channelsResponse.status}`);
      console.log(`Error: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProperDisbursement(); 