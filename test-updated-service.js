import fetch from 'node-fetch';

async function testUpdatedService() {
  const apiKey = 'xnd_development_TdjZAA3kaLKviWBuS3VzgpmgdyC1OpIrvxMUTpxVJNF6POAjjQoN3jJg0Ziv';
  const credentials = Buffer.from(`${apiKey}:`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Testing Updated Xendit Service Format...\n');
  
  try {
    // Test GCash disbursement
    console.log('💰 TEST GCASH DISBURSEMENT:');
    const gcashData = {
      reference_id: 'test-gcash-' + Date.now(),
      amount: 100,
      currency: 'PHP',
      channel_code: 'PH_GCASH',
      account_name: 'Juan Dela Cruz',
      account_number: '09123456789',
      description: 'Test GCash Disbursement'
    };
    
    console.log('GCash request:', JSON.stringify(gcashData, null, 2));
    
    const gcashResponse = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers,
      body: JSON.stringify(gcashData)
    });
    
    const gcashText = await gcashResponse.text();
    
    if (gcashResponse.ok) {
      console.log(`✅ GCASH SUCCESS! Status: ${gcashResponse.status}`);
      console.log('🎉 GCash disbursement created!');
      console.log('Response:', JSON.stringify(JSON.parse(gcashText), null, 2));
    } else {
      console.log(`❌ GCash failed: ${gcashResponse.status}`);
      console.log(`Error: ${gcashText}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test bank transfer
    console.log('🏦 TEST BANK TRANSFER:');
    const bankData = {
      reference_id: 'test-bank-' + Date.now(),
      amount: 200,
      currency: 'PHP', 
      channel_code: 'PH_BPI',
      account_name: 'Maria Santos',
      account_number: '1234567890',
      description: 'Test Bank Transfer'
    };
    
    console.log('Bank request:', JSON.stringify(bankData, null, 2));
    
    const bankResponse = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers,
      body: JSON.stringify(bankData)
    });
    
    const bankText = await bankResponse.text();
    
    if (bankResponse.ok) {
      console.log(`✅ BANK SUCCESS! Status: ${bankResponse.status}`);
      console.log('🎉 Bank transfer created!');
      console.log('Response:', JSON.stringify(JSON.parse(bankText), null, 2));
    } else {
      console.log(`❌ Bank failed: ${bankResponse.status}`);
      console.log(`Error: ${bankText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testUpdatedService(); 