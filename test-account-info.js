import fetch from 'node-fetch';

async function testAccountInfo() {
  const apiKey = 'xnd_development_TdjZAA3kaLKviWBuS3VzgpmgdyC1OpIrvxMUTpxVJNF6POAjjQoN3jJg0Ziv';
  const credentials = Buffer.from(`${apiKey}:`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Testing Xendit Account Capabilities...\n');
  
  try {
    // Test 1: Account Balance (might show supported currencies)
    console.log('💰 ACCOUNT BALANCE:');
    const balanceResponse = await fetch('https://api.xendit.co/balance', {
      headers
    });
    
    if (balanceResponse.ok) {
      const balance = await balanceResponse.json();
      console.log(`✅ Status: ${balanceResponse.status}`);
      console.log('Balance info:', JSON.stringify(balance, null, 2));
    } else {
      console.log(`❌ Balance failed: ${balanceResponse.status}`);
      const errorText = await balanceResponse.text();
      console.log(`Error: ${errorText}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Try creating a test invoice for Philippines
    console.log('📄 TEST PHILIPPINES INVOICE:');
    const invoiceData = {
      external_id: 'test-ph-invoice-' + Date.now(),
      amount: 1000,
      currency: 'PHP',
      description: 'Test Philippines Invoice',
      payment_methods: ['GCASH', 'BPI', 'BDO']
    };
    
    const invoiceResponse = await fetch('https://api.xendit.co/v2/invoices', {
      method: 'POST',
      headers,
      body: JSON.stringify(invoiceData)
    });
    
    if (invoiceResponse.ok) {
      const invoice = await invoiceResponse.json();
      console.log(`✅ Status: ${invoiceResponse.status}`);
      console.log('✅ Philippines invoice created successfully!');
      console.log('Available payment methods:', invoice.available_payment_methods);
    } else {
      console.log(`❌ PH Invoice failed: ${invoiceResponse.status}`);
      const errorText = await invoiceResponse.text();
      console.log(`Error: ${errorText}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 3: Try a test disbursement to see error message
    console.log('💸 TEST DISBURSEMENT:');
    const disbursementData = {
      external_id: 'test-ph-disbursement-' + Date.now(),
      amount: 100,
      bank_code: 'PH_GCASH',
      account_holder_name: 'Test User',
      account_number: 'PH - 09123456789',
      description: 'Test Philippines Disbursement'
    };
    
    const disbursementResponse = await fetch('https://api.xendit.co/disbursements', {
      method: 'POST',
      headers,
      body: JSON.stringify(disbursementData)
    });
    
    if (disbursementResponse.ok) {
      const disbursement = await disbursementResponse.json();
      console.log(`✅ Status: ${disbursementResponse.status}`);
      console.log('✅ Philippines disbursement created!');
      console.log('Disbursement:', disbursement);
    } else {
      console.log(`❌ PH Disbursement failed: ${disbursementResponse.status}`);
      const errorText = await disbursementResponse.text();
      console.log(`Error details: ${errorText}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAccountInfo(); 