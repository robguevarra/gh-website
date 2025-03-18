# Shopify Integration for Members-Only Store

This document outlines the implementation details for integrating Shopify with the Graceful Homeschooling platform to create a seamless members-only store experience.

## Overview

The Graceful Homeschooling platform will integrate with Shopify to provide:

1. A members-only store accessible only to authenticated and authorized users
2. A potential public store available to all visitors
3. A consistent brand experience across the platform and the Shopify stores
4. Unified user authentication between the platform and Shopify

## Integration Architecture

### High-Level Architecture

```
┌─────────────────────────────────┐       ┌───────────────────────┐
│ Graceful Homeschooling Platform │◄──────►│ Shopify Store(s)      │
│                                 │       │                       │
│ - User Authentication           │       │ - Product Catalog     │
│ - Membership Management         │       │ - Cart & Checkout     │
│ - Access Control                │       │ - Order Management    │
└───────────────┬─────────────────┘       └───────────┬───────────┘
                │                                     │
                ▼                                     ▼
      ┌─────────────────────┐             ┌─────────────────────┐
      │ Platform Database   │             │ Shopify Admin API   │
      │ (Supabase)          │◄───────────►│ Storefront API      │
      └─────────────────────┘             └─────────────────────┘
```

### Authentication Flow

1. User logs into the Graceful Homeschooling platform
2. When accessing the Shopify store, a multipass token is generated
3. User is seamlessly authenticated to Shopify without needing to log in again
4. Access control is enforced based on membership tier

## Technical Implementation

### 1. Shopify Store Setup

#### Store Configuration

- Set up Shopify store with appropriate branding
- Configure Shopify Multipass authentication
- Create custom theme matching platform design
- Set up collections for different product categories and access levels

#### Access Control

- Set up password protection for members-only store
- Configure Shopify customer tags for different membership tiers
- Create private apps for API access

### 2. Shopify API Integration

#### Key Shopify APIs

1. **Shopify Admin API**
   - Manage products and collections
   - Access customer and order data
   - Configure store settings

2. **Shopify Storefront API**
   - Display products in custom UI components
   - Implement custom cart functionality
   - Process checkouts

3. **Shopify Multipass**
   - Seamless authentication between platforms
   - Secure customer data transfer

### 3. Implementing Multipass Authentication

```typescript
// Example of Shopify Multipass implementation

import crypto from 'crypto';

export function generateShopifyMultipassToken(user, shopifyDomain, multipassSecret) {
  // Customer data to send to Shopify
  const customerData = {
    email: user.email,
    created_at: new Date().toISOString(),
    first_name: user.first_name,
    last_name: user.last_name,
    tag_string: user.membership_tier, // Use membership tier as tag
    return_to: `/collections/${user.membership_tier}`, // Direct to appropriate collection
  };

  // Convert customer data to JSON and encrypt
  const customerDataJson = JSON.stringify(customerData);
  
  // Generate encryption key and IV from the Multipass secret
  const encryptionKey = crypto
    .createHash('sha256')
    .update(multipassSecret)
    .digest();
  
  const iv = crypto.randomBytes(16);
  
  // Encrypt the customer data
  const cipher = crypto.createCipheriv('aes-256-cbc', encryptionKey, iv);
  let encrypted = cipher.update(customerDataJson, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  // Create signature
  const signature = crypto
    .createHmac('sha256', encryptionKey)
    .update(iv + encrypted)
    .digest('base64');
  
  // Combine IV and encrypted data
  const token = Buffer.from(iv, 'binary').toString('base64') + encrypted;
  
  // URL-safe base64 encode the token and signature
  const urlSafeToken = token
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  
  // Return the Multipass URL
  return `https://${shopifyDomain}/account/login/multipass/${urlSafeToken}`;
}
```

### 4. Storefront Integration

#### Embedding Shopify Products

```typescript
// Example of fetching and displaying Shopify products using Storefront API

import { GraphQLClient } from 'graphql-request';

// Initialize Storefront API client
const storefrontClient = new GraphQLClient(
  `https://${process.env.SHOPIFY_DOMAIN}/api/2023-01/graphql.json`,
  {
    headers: {
      'X-Shopify-Storefront-Access-Token': process.env.SHOPIFY_STOREFRONT_TOKEN,
    },
  }
);

// Query to get products from a specific collection
const PRODUCTS_QUERY = `
  query GetProductsByCollection($collectionId: ID!, $first: Int!) {
    collection(id: $collectionId) {
      title
      products(first: $first) {
        edges {
          node {
            id
            title
            handle
            description
            priceRange {
              minVariantPrice {
                amount
                currencyCode
              }
            }
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
          }
        }
      }
    }
  }
`;

// Function to fetch products for a specific membership tier
export async function getProductsForMembershipTier(membershipTier) {
  try {
    // Map membership tier to collection ID
    const collectionId = getMembershipCollectionId(membershipTier);
    
    // Fetch products using Storefront API
    const data = await storefrontClient.request(PRODUCTS_QUERY, {
      collectionId,
      first: 12, // Number of products to fetch
    });
    
    // Transform response into simpler product objects
    return data.collection.products.edges.map(({ node }) => ({
      id: node.id,
      title: node.title,
      handle: node.handle,
      description: node.description,
      price: node.priceRange.minVariantPrice.amount,
      currency: node.priceRange.minVariantPrice.currencyCode,
      imageUrl: node.images.edges[0]?.node.url || null,
      imageAlt: node.images.edges[0]?.node.altText || node.title,
    }));
  } catch (error) {
    console.error('Error fetching Shopify products:', error);
    return [];
  }
}
```

#### Custom Shopping Cart

```typescript
// Example of custom cart implementation using Storefront API

// Initialize cart in Shopify
export async function createCart() {
  const CREATE_CART_MUTATION = `
    mutation CartCreate {
      cartCreate {
        cart {
          id
          checkoutUrl
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  const response = await storefrontClient.request(CREATE_CART_MUTATION);
  return response.cartCreate.cart;
}

// Add product to cart
export async function addToCart({ cartId, productId, quantity }) {
  const ADD_TO_CART_MUTATION = `
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    product {
                      title
                    }
                    image {
                      url
                    }
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
          estimatedCost {
            totalAmount {
              amount
              currencyCode
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;
  
  const response = await storefrontClient.request(ADD_TO_CART_MUTATION, {
    cartId,
    lines: [
      {
        merchandiseId: productId,
        quantity,
      },
    ],
  });
  
  return response.cartLinesAdd.cart;
}
```

### 5. Order Synchronization

To maintain a unified view of customer purchases:

```typescript
// Example of Shopify webhook handler for order creation

export async function handleShopifyOrderWebhook(req, res) {
  try {
    // Verify Shopify webhook signature
    const hmac = req.headers['x-shopify-hmac-sha256'];
    const isValid = verifyShopifyWebhook(req.body, hmac, process.env.SHOPIFY_WEBHOOK_SECRET);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    const orderData = req.body;
    
    // Find user by email
    const user = await findUserByEmail(orderData.customer.email);
    
    if (!user) {
      console.log('Order received for unknown user:', orderData.customer.email);
      return res.status(200).end();
    }
    
    // Save order in our database
    await saveShopifyOrder({
      userId: user.id,
      shopifyOrderId: orderData.id,
      orderNumber: orderData.order_number,
      totalPrice: orderData.total_price,
      currency: orderData.currency,
      status: orderData.financial_status,
      items: orderData.line_items.map(item => ({
        productId: item.product_id,
        variantId: item.variant_id,
        title: item.title,
        quantity: item.quantity,
        price: item.price,
      })),
      createdAt: new Date(orderData.created_at),
    });
    
    // Update analytics
    await trackPurchaseEvent(user.id, orderData.id, orderData.total_price);
    
    return res.status(200).end();
  } catch (error) {
    console.error('Error processing Shopify order webhook:', error);
    return res.status(500).json({ error: error.message });
  }
}
```

## User Experience

### 1. Store Access

- Members will access the store through a "Store" link in the platform navigation
- Authentication will happen seamlessly via Multipass
- Users will be directed to collections appropriate for their membership tier

### 2. Integration Points in the Platform UI

- **Product Showcases**: Featured products can be displayed on dashboard and course pages
- **Product Recommendations**: Related products shown at the end of courses
- **Purchase History**: User's Shopify orders visible in their account dashboard
- **Store Notifications**: Announcements about new products or promotions

### 3. Custom Theme Elements

- Custom Shopify theme matching Graceful Homeschooling design
- Consistent typography, colors, and components
- Seamless navigation between the platform and store
- Mobile-responsive design across both systems

## Technical Considerations

### 1. API Rate Limits

- Implement caching for Shopify API responses
- Use webhooks for real-time updates instead of polling
- Batch operations where possible

### 2. Data Synchronization

- Use webhooks to keep customer and order data in sync
- Implement reconciliation processes for data integrity
- Log synchronization events for troubleshooting

### 3. Security

- Secure storage of Shopify API credentials
- Proper implementation of Multipass encryption
- Regular rotation of API keys
- HTTPS for all communications

### 4. Performance

- Lazy-load Shopify content
- Cache product data where appropriate
- Optimize images and assets
- Implement loading states for Shopify content

## Implementation Phases

### Phase A: Store Setup & Authentication

1. Set up Shopify store with branding and theme
2. Configure multipass authentication
3. Implement basic product collections
4. Create password protection for members-only access

### Phase B: Platform Integration

1. Implement Shopify API integrations
2. Build product showcases within the platform
3. Create seamless navigation between platforms
4. Implement user account linking

### Phase C: Enhanced Features

1. Build custom shopping cart experience
2. Implement order history in user dashboard
3. Add product recommendations
4. Create analytics for cross-platform shopping behavior

### Phase D: Public Store (Future)

1. Set up separate public store
2. Implement promotional content on public site
3. Add conversion paths from public to members-only experience
4. Implement advanced analytics and tracking

## Testing Strategy

1. **Authentication Testing**
   - Verify seamless login between platforms
   - Test access control for different membership tiers
   - Validate security of the authentication process

2. **Integration Testing**
   - Ensure products display correctly in platform
   - Test cart and checkout functionality
   - Verify order synchronization

3. **User Experience Testing**
   - Conduct usability tests with sample users
   - Validate mobile responsiveness
   - Test navigation patterns between platforms

## Monitoring and Maintenance

1. **Regular Checks**
   - Monitor Shopify API changes and deprecations
   - Test authentication flow periodically
   - Review error logs for integration issues

2. **Performance Monitoring**
   - Track API response times
   - Monitor synchronization errors
   - Check for broken product links

## Appendix

### Shopify API Resources

- [Shopify Admin API Reference](https://shopify.dev/docs/admin-api)
- [Shopify Storefront API Reference](https://shopify.dev/docs/storefront-api)
- [Shopify Multipass Documentation](https://shopify.dev/docs/admin-api/rest/reference/plus/multipass)

### Example Shopify API Response

```json
{
  "collection": {
    "title": "Premium Members",
    "products": {
      "edges": [
        {
          "node": {
            "id": "gid://shopify/Product/1234567890",
            "title": "Commercial License Pack",
            "handle": "commercial-license-pack",
            "description": "Full commercial license for all paper templates",
            "priceRange": {
              "minVariantPrice": {
                "amount": "99.99",
                "currencyCode": "USD"
              }
            },
            "images": {
              "edges": [
                {
                  "node": {
                    "url": "https://cdn.shopify.com/s/files/1/0123/4567/8901/products/license-pack.jpg",
                    "altText": "Commercial License Pack"
                  }
                }
              ]
            }
          }
        }
      ]
    }
  }
}
``` 