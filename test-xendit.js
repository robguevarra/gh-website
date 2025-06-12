import fetch from 'node-fetch';

async function testXenditPH() {
  const apiKey = 'xnd_development_TdjZAA3kaLKviWBuS3VzgpmgdyC1OpIrvxMUTpxVJNF6POAjjQoN3jJg0Ziv';
  const credentials = Buffer.from(`${apiKey}:`).toString('base64');
  
  console.log('Testing Xendit Philippines Disbursement API...');
  
  try {
    // Test available banks
    const response = await fetch('https://api.xendit.co/available_disbursements_banks', {
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json'
      }
    });
    
    const banks = await response.json();
    console.log('Available Banks Response:');
    console.log('Status:', response.status);
    console.log('Total banks:', banks.length);
    
    // Look for GCash and popular PH banks
    const gcash = banks.find(bank => bank.name.toLowerCase().includes('gcash') || bank.code === 'GCASH');
    const bpi = banks.find(bank => bank.name.toLowerCase().includes('bpi'));
    const bdo = banks.find(bank => bank.name.toLowerCase().includes('bdo'));
    
    console.log('\n=== PHILIPPINES SUPPORT ===');
    console.log('GCash Support:', gcash ? 'YES ✅' : 'NO ❌');
    if (gcash) {
      console.log('GCash Details:', JSON.stringify(gcash, null, 2));
    }
    
    console.log('BPI Support:', bpi ? 'YES ✅' : 'NO ❌');
    console.log('BDO Support:', bdo ? 'YES ✅' : 'NO ❌');
    
    // Show sample of available banks
    console.log('\n=== SAMPLE BANKS ===');
    banks.slice(0, 10).forEach(bank => {
      console.log(`${bank.code}: ${bank.name} (Disburse: ${bank.can_disburse}, Validate: ${bank.can_name_validate})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testXenditPH(); 