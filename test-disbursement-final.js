import fetch from 'node-fetch';

async function testFinalDisbursement() {
  const apiKey = 'xnd_development_TdjZAA3kaLKviWBuS3VzgpmgdyC1OpIrvxMUTpxVJNF6POAjjQoN3jJg0Ziv';
  const credentials = Buffer.from(`${apiKey}:`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Testing Final Xendit Disbursement with Currency...\n');
  
  try {
    // Test disbursement with currency
    console.log('💸 TEST DISBURSEMENT (Complete Format):');
    const disbursementData = {
      reference_id: 'test-ph-disbursement-' + Date.now(),
      amount: 100,
      currency: 'PHP',
      channel_code: 'PH_GCASH',
      account_name: 'Test User',
      account_number: '09123456789',
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
      console.log(`✅ SUCCESS! Status: ${disbursementResponse.status}`);
      console.log('🎉 Philippines GCash disbursement created!');
      console.log('Disbursement details:', JSON.stringify(disbursement, null, 2));
    } else {
      console.log(`❌ Disbursement failed: ${disbursementResponse.status}`);
      console.log(`Error details: ${responseText}`);
      
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
    
    // Test with a bank transfer instead
    console.log('🏦 TEST BANK TRANSFER:');
    const bankData = {
      reference_id: 'test-ph-bank-' + Date.now(),
      amount: 50,
      currency: 'PHP',
      channel_code: 'PH_BPI',
      account_name: 'Test User',
      account_number: '1234567890',
      description: 'Test Philippines Bank Transfer'
    };
    
    console.log('Bank request data:', JSON.stringify(bankData, null, 2));
    
    const bankResponse = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers,
      body: JSON.stringify(bankData)
    });
    
    const bankResponseText = await bankResponse.text();
    
    if (bankResponse.ok) {
      const bankDisbursement = JSON.parse(bankResponseText);
      console.log(`✅ SUCCESS! Bank Status: ${bankResponse.status}`);
      console.log('🎉 Philippines bank transfer created!');
      console.log('Bank transfer details:', JSON.stringify(bankDisbursement, null, 2));
    } else {
      console.log(`❌ Bank transfer failed: ${bankResponse.status}`);
      console.log(`Error details: ${bankResponseText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testFinalDisbursement(); 