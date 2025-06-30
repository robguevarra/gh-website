const https = require('https');

const PRODUCTION_BASE_URL = 'https://gracefulhomeschooling.com';
const TEMPLATE_ID = '3b292bfd-bec2-42ac-aa2c-97d3edd3501d';

// You'll need to get your session cookie from the browser dev tools
const SESSION_COOKIE = 'your-session-cookie-here';

async function callProductionMigration(batchSize = 5, startFrom = 0, testEmails = null) {
  const data = JSON.stringify({
    templateId: TEMPLATE_ID,
    batchSize,
    startFrom,
    testEmails
  });

  const options = {
    hostname: 'gracefulhomeschooling.com',
    port: 443,
    path: '/api/admin/campaigns/send-template-migration',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Cookie': SESSION_COOKIE
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          resolve(result);
        } catch (error) {
          reject(new Error(`Failed to parse response: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

async function runMigration() {
  console.log('🚀 Starting production migration...');
  
  // First test with your email
  console.log('🧪 Testing with robneil@gmail.com...');
  try {
    const testResult = await callProductionMigration(1, 0, ['robneil@gmail.com']);
    console.log('✅ Test result:', testResult);
    
    if (testResult.successCount === 1) {
      console.log('🎉 Test successful! Ready for full migration');
      
      // Ask user to confirm before proceeding
      console.log('⚠️  Update SESSION_COOKIE in this script and run full migration manually');
      
    } else {
      console.error('❌ Test failed:', testResult.errors);
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error.message);
  }
}

// Instructions
console.log(`
📋 Instructions:
1. Open browser dev tools on ${PRODUCTION_BASE_URL}
2. Go to Application > Cookies
3. Copy your session cookie value
4. Replace SESSION_COOKIE in this script
5. Run: node scripts/production-migration.js
`);

if (SESSION_COOKIE === 'your-session-cookie-here') {
  console.log('⚠️  Please update SESSION_COOKIE first!');
} else {
  runMigration();
} 