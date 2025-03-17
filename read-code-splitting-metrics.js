const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('./lighthouse-after-code-splitting.json'));
  
  const metrics = {
    performance: data.categories.performance.score * 100,
    accessibility: data.categories.accessibility.score * 100,
    bestPractices: data.categories['best-practices'].score * 100,
    seo: data.categories.seo.score * 100,
    lcp: data.audits['largest-contentful-paint'].numericValue,
    fid: data.audits['max-potential-fid'].numericValue,
    cls: data.audits['cumulative-layout-shift'].numericValue,
    tti: data.audits['interactive'].numericValue,
    tbt: data.audits['total-blocking-time'].numericValue
  };
  
  console.log(JSON.stringify(metrics, null, 2));
} catch (error) {
  console.error('Error reading metrics:', error.message);
} 