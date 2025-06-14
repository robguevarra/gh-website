# Test Files for Xendit Integration

This directory contains test scripts for validating the Xendit Payouts API v2 integration:

## Available Tests

- `test-xendit-payouts-ph.js` - Basic API connectivity and channel verification
- `test-service-integration.js` - Comprehensive service integration testing  
- `test-webhook-handler.js` - Webhook payload validation

## Usage

```bash
# Basic connectivity test (safe, no actual payouts)
node test-xendit-payouts-ph.js

# Service integration test (safe, dry run only)
node test-service-integration.js

# Webhook payload analysis
node test-webhook-handler.js --examples

# Live payout tests (⚠️ creates actual payouts)
node test-xendit-payouts-ph.js --live
node test-service-integration.js --live
```

## Environment Requirements

- Node.js v18+
- Environment variables in `.env.local`:
  - `XENDIT_SECRET_KEY` - Your Xendit development API key
  - `XENDIT_WEBHOOK_SECRET` - Webhook verification token (optional)

## Test Results

See `TESTING_SUMMARY.md` for detailed test results and integration status.

## Production Testing

For staging/production testing:
1. Update environment variables to use production keys
2. Test with small amounts first (PHP 100)
3. Verify webhook delivery to your server
4. Monitor logs for any issues

**⚠️ WARNING**: Using `--live` flag creates actual payouts and may incur charges! 