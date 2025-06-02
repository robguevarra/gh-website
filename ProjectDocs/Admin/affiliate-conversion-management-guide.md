# Affiliate Conversion Management - Administrator Guide

## Overview

This guide provides comprehensive information for administrators managing the affiliate conversion tracking system. It covers conversion management workflows, status transitions, commission calculations, troubleshooting common issues, and admin API endpoints.

## Conversion Management Dashboard

### Accessing the Dashboard

The affiliate conversion management dashboard is available at:
- **URL**: `/admin/affiliate/conversions`
- **Access**: Requires admin privileges with the `affiliate_management` permission

### Dashboard Features

1. **Conversion List View**
   - Displays all conversions with filtering options
   - Sortable by date, amount, affiliate, and status
   - Quick-view panel shows commission amounts and affiliate details

2. **Status Management**
   - Color-coded status indicators:
     - `pending` (yellow): Newly recorded conversion awaiting verification
     - `cleared` (green): Verified conversion eligible for payment
     - `paid` (blue): Commission has been paid to the affiliate
     - `flagged` (red): Conversion requires review due to potential issues

3. **Batch Operations**
   - Select multiple conversions to update status
   - Export selected conversions to CSV/Excel
   - Generate commission reports by time period

## Managing Conversion Statuses

### Status Lifecycle

Conversions follow this typical lifecycle:
1. **Pending**: Initial state when conversion is first recorded through Xendit webhook
2. **Cleared**: After verification, mark conversions as cleared for payment
3. **Paid**: Once commission is paid, mark conversions as paid
4. **Flagged**: Used for conversions requiring investigation (potential fraud, returns, etc.)

### Status Transition Rules

- **Pending → Cleared**: After refund period expires or manual verification
- **Cleared → Paid**: After payment batch is processed
- **Any Status → Flagged**: Can flag conversions at any point if issues arise
- **Flagged → Cleared/Pending**: After investigation resolves the issue

### How to Update Status

1. **Individual Updates**:
   - Click the status dropdown next to any conversion
   - Select the new status
   - Optional: Add a note explaining the change

2. **Batch Updates**:
   - Use checkboxes to select multiple conversions
   - Click "Update Status" from the actions menu
   - Select the target status and confirm

## Commission Calculation and Management

### Understanding Commission Rates

| Membership Tier | Commission Rate | Description |
|----------------|----------------|-------------|
| Course Enrollee Tier | 25% | For verified course enrollees |
| Network Partner Tier | 30% | Base tier for network partners |
| Network Elite Tier | 35% | Premium tier for high-performing network partners |
| Standard Affiliate Tier | 20% | Default for new affiliates |
| Secondary Commission Tier | 10% | For level 2 commissions |

### Updating Tier Assignments

1. Navigate to the affiliate profile
2. Select "Edit Membership Tier"
3. Choose the appropriate tier from the dropdown
4. Click "Save Changes"

### Commission Override

For special cases requiring commission adjustment:

1. Navigate to the specific conversion
2. Click "Override Commission"
3. Enter the new commission amount and reason
4. Click "Save Override"

Note: All overrides are logged for audit purposes.

## Network Partner Management

### Postback System

The system automatically creates postback records for network partner conversions:

- Initial Status: `pending`
- Success: Changes to `sent`
- Failure: Changes to `failed`

### Managing Failed Postbacks

1. Navigate to "Network Postbacks" tab
2. Filter by status: `failed`
3. Select postbacks to retry
4. Click "Retry Selected"

### Viewing Postback Logs

Each postback attempt is logged with:
- Timestamp
- Response status code
- Response body
- Error details (if applicable)

## Troubleshooting Common Issues

### 1. Missing Affiliate Attribution

**Symptoms**: Conversion recorded without affiliate attribution

**Possible causes**:
- Cookies were not properly set during click
- Cookies expired before purchase (default: 30-day expiry)
- User cleared cookies between click and purchase
- Multiple devices used (clicked on mobile, purchased on desktop)

**Solutions**:
1. Check if the user has any click records in `affiliate_clicks` table
2. If valid clicks exist, manually update the conversion with the appropriate affiliate_id
3. Adjust cookie expiration if this is happening frequently

### 2. Commission Calculation Discrepancies

**Symptoms**: Commission amount doesn't match expected calculation

**Possible causes**:
- Membership tier changed between click and conversion
- GMV value entered incorrectly
- Trigger function issue
- Manual override applied

**Solutions**:
1. Verify the affiliate's membership tier at time of conversion
2. Check if the GMV value is correct
3. Review any manual overrides that may have been applied
4. Test the commission calculation trigger with sample data

### 3. Failed Network Postbacks

**Symptoms**: Network postbacks stuck in `failed` status

**Possible causes**:
- Network endpoint is unavailable
- Malformed postback URL
- Network requires authentication not provided
- Request timeout

**Solutions**:
1. Verify the network endpoint is accessible
2. Check the postback URL template format in environment variables
3. Review network documentation for authentication requirements
4. Check for timeouts and adjust retry logic if needed

## Admin API Endpoints

### Conversion Management

```
PUT /api/admin/affiliate/conversions/status
```
- Updates conversion status (single or batch)
- Requires `affiliate_management` permission
- Body format:
  ```json
  {
    "conversionIds": ["uuid1", "uuid2"],
    "status": "cleared",
    "note": "Optional explanation"
  }
  ```

```
GET /api/admin/affiliate/conversions
```
- Lists conversions with filtering options
- Query parameters:
  - `status`: Filter by status
  - `affiliateId`: Filter by affiliate
  - `startDate`/`endDate`: Date range
  - `limit`/`offset`: Pagination

### Membership Tier Management

```
PUT /api/admin/affiliate/membership
```
- Updates an affiliate's membership tier
- Body format:
  ```json
  {
    "affiliateId": "uuid",
    "membershipLevelId": "uuid"
  }
  ```

```
GET /api/admin/affiliate/membership/tiers
```
- Retrieves all available membership tiers

### Network Postback Management

```
POST /api/admin/affiliate/postback/retry
```
- Retries failed postbacks
- Body format:
  ```json
  {
    "postbackIds": ["uuid1", "uuid2"]
  }
  ```

## Security Considerations

- All admin API endpoints require authentication
- JWT tokens include the affiliate_management permission
- All status changes and commission overrides are logged in the audit trail
- IP restrictions should be configured for admin endpoints

## Best Practices

1. **Regular Verification**: Review pending conversions at least weekly
2. **Batch Processing**: Process status updates in batches for efficiency
3. **Fraud Monitoring**: Regularly check for unusual conversion patterns
4. **Documentation**: Add notes to explain any manual interventions
5. **Backup**: Export conversion data regularly for backup purposes

## Support Resources

For technical issues with the affiliate conversion system, contact:
- Technical support: dev-team@example.com
- System administrator: admin@example.com
- Documentation repository: [Internal Wiki Link]
