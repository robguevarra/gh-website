# Xendit Payment Integration

This document outlines the implementation details for integrating Xendit as the payment processing solution for the Graceful Homeschooling platform.

## Overview

Xendit will be used to create a custom checkout experience for purchasing courses and memberships. The implementation will replace the current Xendit invoice links with a seamless in-platform checkout flow that maintains the design language of the site.

## Integration Points

### 1. Checkout Flow

The checkout flow will be implemented as follows:

1. User selects a course or membership to purchase
2. User is directed to a custom checkout page within our platform
3. User enters payment and billing information
4. Payment is processed via Xendit API
5. User receives confirmation and is enrolled in the course/membership

### 2. Payment Methods

Initially, we will support the following payment methods through Xendit:

- Credit/Debit Cards
- Bank Transfers
- E-wallets (where supported by Xendit)

### 3. Subscription Payments

For future subscription implementations, we will utilize Xendit's recurring payment capabilities:

- Initial payment setup
- Automatic recurring billing
- Subscription management (upgrade/downgrade/cancel)
- Failed payment handling

## Technical Implementation

### API Integration

#### Xendit API Endpoints

We will utilize the following Xendit API endpoints:

1. **Authentication**
   - Use API keys stored securely in environment variables

2. **Creating Payments**
   - `POST /v2/invoices` - Create an invoice
   - `POST /v2/checkout` - Create a checkout session

3. **Managing Payments**
   - `GET /v2/invoices/{id}` - Retrieve invoice details
   - `POST /v2/invoices/{id}/expire` - Expire an invoice

4. **Webhook Handling**
   - Listen for payment notifications
   - Process subscription events

### Implementation Details

#### 1. Server-Side Integration

```typescript
// Example of server-side Xendit integration

import Xendit from 'xendit-node';

// Initialize Xendit with secret key
const xendit = new Xendit({
  secretKey: process.env.XENDIT_SECRET_KEY,
});

// Access Invoice API
const { Invoice } = xendit;
const invoiceClient = new Invoice({});

// Create a new invoice
export async function createPayment({
  userId,
  productId,
  amount,
  description,
  customerEmail,
  customerName,
  successRedirectUrl,
  failureRedirectUrl,
}) {
  try {
    // Get product details from database
    const product = await getProductDetails(productId);
    
    // Create invoice via Xendit
    const invoice = await invoiceClient.createInvoice({
      external_id: `order-${userId}-${Date.now()}`,
      amount,
      description,
      invoice_duration: 86400, // 24 hours
      customer: {
        given_names: customerName,
        email: customerEmail,
      },
      success_redirect_url: successRedirectUrl,
      failure_redirect_url: failureRedirectUrl,
      currency: 'PHP', // Or appropriate currency
      items: [
        {
          name: product.name,
          quantity: 1,
          price: amount,
          category: product.type,
        },
      ],
    });

    // Store invoice details in our database
    await storePaymentDetails({
      userId,
      productId,
      xenditInvoiceId: invoice.id,
      amount,
      status: 'pending',
      createdAt: new Date(),
    });

    return {
      success: true,
      invoiceId: invoice.id,
      checkoutUrl: invoice.invoice_url,
    };
  } catch (error) {
    console.error('Error creating Xendit payment:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}
```

#### 2. Webhook Handler

```typescript
// Example webhook handler for Xendit notifications

export async function handleXenditWebhook(req, res) {
  try {
    const eventData = req.body;
    
    // Verify webhook signature
    const isValidSignature = verifyXenditSignature(
      req.headers['x-callback-token'],
      process.env.XENDIT_CALLBACK_TOKEN
    );
    
    if (!isValidSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    // Process based on event type
    if (eventData.status === 'PAID') {
      // Payment was successful
      
      // 1. Update payment record in database
      await updatePaymentStatus(eventData.external_id, 'completed');
      
      // 2. Process order fulfillment
      const orderId = extractOrderIdFromExternalId(eventData.external_id);
      await processOrderFulfillment(orderId);
      
      // 3. Send confirmation email
      await sendPaymentConfirmationEmail(eventData.customer.email);
      
      return res.status(200).json({ success: true });
    } else if (eventData.status === 'EXPIRED') {
      // Payment expired
      await updatePaymentStatus(eventData.external_id, 'expired');
      return res.status(200).json({ success: true });
    }
    
    // Other event types
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error processing Xendit webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

#### 3. Custom Checkout UI

The custom checkout UI will be implemented as a multi-step form with the following components:

1. **Product Summary**
   - Display course/membership details
   - Show pricing information
   - Apply discount codes

2. **Customer Information**
   - Name
   - Email
   - Additional contact details

3. **Payment Method Selection**
   - Credit/debit card
   - Bank transfer options
   - E-wallet options

4. **Billing Information**
   - Billing address
   - Tax information if applicable

5. **Review & Confirm**
   - Order summary
   - Total amount
   - Terms and conditions

### Handling Successful Payments

When a payment is successful:

1. The payment status is updated in our database
2. The user is enrolled in the purchased course or given membership access
3. A confirmation email is sent to the user
4. The user is redirected to a success page
5. Analytics events are triggered for tracking conversions

### Error Handling

The system will handle the following error scenarios:

1. **Payment Failures**
   - Display user-friendly error messages
   - Provide options to try alternative payment methods
   - Log errors for analysis

2. **Network Issues**
   - Implement retry mechanisms
   - Store payment intent for recovery

3. **Validation Errors**
   - Real-time form validation
   - Clear error messaging

## Testing

The implementation will include comprehensive testing:

1. **Unit Tests**
   - API integration functions
   - Webhook handler
   - Database operations

2. **Integration Tests**
   - End-to-end payment flow
   - Webhook processing

3. **Manual Testing**
   - Test payments with Xendit sandbox environment
   - Test all supported payment methods
   - Verify error scenarios

## Security Considerations

1. **PCI Compliance**
   - Use Xendit's secure elements for card information
   - Never store sensitive payment details on our servers

2. **API Key Security**
   - Store API keys in environment variables
   - Use different keys for development and production

3. **Webhook Validation**
   - Verify webhook signatures
   - Implement IP filtering for Xendit callbacks

4. **Data Protection**
   - Encrypt sensitive user information
   - Implement proper access controls

## Monitoring and Analytics

1. **Payment Metrics**
   - Conversion rates
   - Average order value
   - Payment method distribution

2. **Error Tracking**
   - Monitor payment failures
   - Track error rates by payment method

3. **Performance Monitoring**
   - Checkout page load time
   - Payment processing time

## Future Enhancements

1. **Subscription Management**
   - Implement recurring billing for memberships
   - Add subscription management UI for users

2. **Payment Method Expansion**
   - Add support for additional payment methods
   - Implement saved payment methods

3. **Advanced Fraud Detection**
   - Implement additional security measures
   - Monitor for suspicious transaction patterns

## Implementation Roadmap

1. **Phase 1: Basic Integration**
   - Implement core API integration
   - Create webhook handlers
   - Build basic checkout UI

2. **Phase 2: Enhanced Features**
   - Add discount code support
   - Implement abandoned cart recovery
   - Add analytics tracking

3. **Phase 3: Subscription Support**
   - Implement recurring billing
   - Create subscription management UI
   - Develop automated renewal notifications

## API Reference

### Xendit API Documentation

- **Base URL**: `https://api.xendit.co`
- **API Version**: v2
- **Documentation**: [Xendit API Docs](https://developers.xendit.co/api-reference/)

### Key Endpoints

- **Create Invoice**: `POST /v2/invoices`
- **Get Invoice**: `GET /v2/invoices/{id}`
- **Expire Invoice**: `POST /v2/invoices/{id}/expire`

## Conclusion

This integration will provide a seamless payment experience for users while maintaining control over the checkout flow. By implementing a custom solution rather than relying on Xendit's standard invoice links, we can create a more cohesive user experience that aligns with the platform's design language and conversion optimization goals. 