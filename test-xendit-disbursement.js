import fetch from 'node-fetch';

async function testXenditAPIs() {
  const apiKey = 'xnd_development_TdjZAA3kaLKviWBuS3VzgpmgdyC1OpIrvxMUTpxVJNF6POAjjQoN3jJg0Ziv';
  const credentials = Buffer.from(`${apiKey}:`).toString('base64');
  
  const headers = {
    'Authorization': `Basic ${credentials}`,
    'Content-Type': 'application/json'
  };
  
  console.log('🔍 Testing Xendit APIs: Payment vs Disbursement...\n');
  
  try {
    // Test 1: Payment Channels (what you see working)
    console.log('📱 PAYMENT CHANNELS API:');
    const paymentResponse = await fetch('https://api.xendit.co/payment_channels', {
      headers
    });
    
    if (paymentResponse.ok) {
      const paymentChannels = await paymentResponse.json();
      console.log(`✅ Status: ${paymentResponse.status}`);
      console.log(`✅ Total channels: ${paymentChannels.length}`);
      
      // Look for PH channels
      const phChannels = paymentChannels.filter(channel => 
        channel.country === 'PH' || 
        channel.name?.toLowerCase().includes('gcash') ||
        channel.name?.toLowerCase().includes('philippines')
      );
      
      console.log(`🇵🇭 Philippines channels found: ${phChannels.length}`);
      phChannels.slice(0, 5).forEach(channel => {
        console.log(`   - ${channel.code}: ${channel.name} (${channel.country})`);
      });
    } else {
      console.log(`❌ Payment channels failed: ${paymentResponse.status}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 2: Disbursement Banks (what we tested before)
    console.log('🏦 DISBURSEMENT BANKS API:');
    const disbursementResponse = await fetch('https://api.xendit.co/available_disbursements_banks', {
      headers
    });
    
    if (disbursementResponse.ok) {
      const banks = await disbursementResponse.json();
      console.log(`✅ Status: ${disbursementResponse.status}`);
      console.log(`✅ Total banks: ${banks.length}`);
      
      // Look for PH banks
      const phBanks = banks.filter(bank => 
        bank.code?.startsWith('PH_') || 
        bank.name?.toLowerCase().includes('philippines') ||
        bank.name?.toLowerCase().includes('gcash') ||
        bank.name?.toLowerCase().includes('bpi') ||
        bank.name?.toLowerCase().includes('bdo')
      );
      
      console.log(`🇵🇭 Philippines banks found: ${phBanks.length}`);
      phBanks.forEach(bank => {
        console.log(`   - ${bank.code}: ${bank.name}`);
      });
      
      if (phBanks.length === 0) {
        console.log('❌ No PH banks found in disbursement API');
        console.log('📝 First 5 available banks:');
        banks.slice(0, 5).forEach(bank => {
          console.log(`   - ${bank.code}: ${bank.name}`);
        });
      }
    } else {
      console.log(`❌ Disbursement banks failed: ${disbursementResponse.status}`);
      const errorText = await disbursementResponse.text();
      console.log(`Error: ${errorText}`);
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Test 3: Available Disbursement Countries
    console.log('🌏 AVAILABLE DISBURSEMENT COUNTRIES:');
    const countriesResponse = await fetch('https://api.xendit.co/available_disbursement_countries', {
      headers
    });
    
    if (countriesResponse.ok) {
      const countries = await countriesResponse.json();
      console.log(`✅ Status: ${countriesResponse.status}`);
      console.log('Available countries:', countries);
    } else {
      console.log(`❌ Countries endpoint failed: ${countriesResponse.status}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testXenditAPIs(); 