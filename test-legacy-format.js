import fetch from 'node-fetch';

async function testLegacyFormat() {
  const apiKey = 'xnd_development_TdjZAA3kaLKviWBuS3VzgpmgdyC1OpIrvxMUTpxVJNF6POAjjQoN3jJg0Ziv';
  const credentials = Buffer.from(`${apiKey}:`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Testing Legacy Xendit Disbursement Format...\n');
  
  try {
    // Test using our current interface format
    console.log('💸 TEST LEGACY DISBURSEMENT FORMAT:');
    const legacyData = {
      external_id: 'test-ph-legacy-' + Date.now(),
      amount: 100,
      bank_code: 'GCASH',
      account_holder_name: 'Test User', 
      account_number: '09123456789',
      description: 'Test Legacy Format'
    };
    
    console.log('Legacy request:', JSON.stringify(legacyData, null, 2));
    
    const legacyResponse = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers,
      body: JSON.stringify(legacyData)
    });
    
    const legacyText = await legacyResponse.text();
    
    if (legacyResponse.ok) {
      console.log(`✅ SUCCESS! Status: ${legacyResponse.status}`);
      console.log('🎉 Legacy format works!');
      console.log('Response:', JSON.stringify(JSON.parse(legacyText), null, 2));
    } else {
      console.log(`❌ Legacy failed: ${legacyResponse.status}`);
      console.log(`Error: ${legacyText}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Try without PH_ prefix
    console.log('💸 TEST WITHOUT PREFIX:');
    const noPrefixData = {
      external_id: 'test-no-prefix-' + Date.now(),
      amount: 100,
      bank_code: 'BPI',
      account_holder_name: 'Test User',
      account_number: '1234567890',
      description: 'Test Without PH Prefix'
    };
    
    console.log('No prefix request:', JSON.stringify(noPrefixData, null, 2));
    
    const noPrefixResponse = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers,
      body: JSON.stringify(noPrefixData)
    });
    
    const noPrefixText = await noPrefixResponse.text();
    
    if (noPrefixResponse.ok) {
      console.log(`✅ SUCCESS! Status: ${noPrefixResponse.status}`);
      console.log('🎉 No prefix format works!');
      console.log('Response:', JSON.stringify(JSON.parse(noPrefixText), null, 2));
    } else {
      console.log(`❌ No prefix failed: ${noPrefixResponse.status}`);
      console.log(`Error: ${noPrefixText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLegacyFormat(); 