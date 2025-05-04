# Entity Relationship Diagram (ERD) for User-Related Tables

## Overview
This document provides a comprehensive Entity Relationship Diagram (ERD) for the user-related tables in the Graceful Homeschooling database. The ERD illustrates the relationships between tables, their cardinality, and the key fields that connect them. This diagram is essential for understanding the data model that powers the admin user management system.

## Core User Tables

```
┌─────────────────────────┐
│     unified_profiles    │
├─────────────────────────┤
│ id (PK)                 │◄─────────┐
│ email                   │          │
│ first_name              │          │
│ last_name               │          │
│ phone                   │          │
│ tags                    │          │
│ acquisition_source      │          │
│ status                  │          │
│ admin_metadata          │          │
│ created_at              │          │
│ updated_at              │          │
│ last_login_at           │          │
│ login_count             │          │
└─────────────────────────┘          │
          ▲                          │
          │                          │
          │ 1:M                      │
          │                          │
┌─────────────────────────┐          │
│      transactions       │          │
├─────────────────────────┤          │
│ id (PK)                 │          │
│ user_id (FK)            │──────────┘
│ amount                  │
│ currency                │
│ status                  │
│ payment_method          │
│ transaction_type        │
│ external_id             │
│ created_at              │
│ updated_at              │
│ paid_at                 │
│ settled_at              │
│ expires_at              │
│ metadata                │
│ contact_email           │
└─────────────────────────┘
          ▲
          │
          │ 1:M
          │
┌─────────────────────────┐
│      enrollments        │
├─────────────────────────┤
│ id (PK)                 │
│ user_id (FK)            │──────────┐
│ course_id (FK)          │──────┐   │
│ transaction_id (FK)     │──────┼───┘
│ status                  │      │
│ enrolled_at             │      │
│ expires_at              │      │
│ last_accessed_at        │      │
│ metadata                │      │
└─────────────────────────┘      │
                                 │
                                 │
┌─────────────────────────┐      │
│        courses          │      │
├─────────────────────────┤      │
│ id (PK)                 │◄─────┘
│ title                   │
│ description             │
│ ...                     │
└─────────────────────────┘
```

## Shopify Integration Tables

```
┌─────────────────────────┐
│     unified_profiles    │
├─────────────────────────┤
│ id (PK)                 │◄─────────┐
│ ...                     │          │
└─────────────────────────┘          │
          ▲                          │
          │                          │
          │ 1:1                      │
          │                          │
┌─────────────────────────┐          │
│    shopify_customers    │          │
├─────────────────────────┤          │
│ id (PK)                 │          │
│ unified_profile_id (FK) │──────────┘
│ shopify_customer_id     │
│ email                   │
│ first_name              │
│ last_name               │
│ phone                   │
│ accepts_marketing       │
│ orders_count            │
│ total_spent             │
│ state                   │
│ tags                    │
│ created_at              │
│ updated_at              │
└─────────────────────────┘
          ▲
          │
          │ 1:M
          │
┌─────────────────────────┐
│     shopify_orders      │
├─────────────────────────┤
│ id (PK)                 │
│ customer_id (FK)        │──────────┘
│ shopify_order_id        │
│ order_number            │
│ email                   │
│ phone                   │
│ total_price             │
│ subtotal_price          │
│ total_tax               │
│ total_discounts         │
│ currency                │
│ financial_status        │
│ fulfillment_status      │
│ landing_site            │
│ referring_site          │
│ source_name             │
│ tags                    │
│ created_at              │
│ updated_at              │
│ processed_at            │
│ closed_at               │
│ cancelled_at            │
└─────────────────────────┘
          ▲
          │
          │ 1:M
          │
┌─────────────────────────┐          ┌─────────────────────────┐
│   shopify_order_items   │          │    shopify_products     │
├─────────────────────────┤          ├─────────────────────────┤
│ id (PK)                 │          │ id (PK)                 │
│ order_id (FK)           │──────────┘ shopify_product_id      │
│ shopify_line_item_id    │          │ title                   │
│ product_id (FK)         │◄─────────┤ handle                  │
│ variant_id (FK)         │          │ product_type            │
│ shopify_product_id      │          │ status                  │
│ shopify_variant_id      │          │ created_at              │
│ title                   │          │ updated_at              │
│ variant_title           │          │ published_at            │
│ sku                     │          │ vendor                  │
│ quantity                │          │ tags                    │
│ price                   │          │ featured_image_url      │
│ total_discount          │          │ google_drive_file_id    │
│ vendor                  │          │ description_html        │
└─────────────────────────┘          │ image_urls              │
                                    │ collection_handles      │
                                    │ is_one_time_purchase    │
                                    └─────────────────────────┘
```

## Admin-Specific Tables

```
┌─────────────────────────┐
│     unified_profiles    │
├─────────────────────────┤
│ id (PK)                 │◄─────────┐
│ ...                     │          │
└─────────────────────────┘          │
          ▲                          │
          │                          │
          │ 1:M                      │ 1:M
          │                          │
┌─────────────────────────┐          │
│      user_notes         │          │
├─────────────────────────┤          │
│ id (PK)                 │          │
│ user_id (FK)            │──────────┘
│ admin_id (FK)           │──────────┐
│ note_text               │          │
│ note_type               │          │
│ is_pinned               │          │
│ created_at              │          │
│ updated_at              │          │
└─────────────────────────┘          │
                                    │
                                    │
┌─────────────────────────┐          │
│    admin_audit_log      │          │
├─────────────────────────┤          │
│ id (PK)                 │          │
│ admin_id (FK)           │──────────┘
│ user_id (FK)            │──────────┐
│ action_type             │          │
│ entity_type             │          │
│ entity_id               │          │
│ previous_state          │          │
│ new_state               │          │
│ ip_address              │          │
│ user_agent              │          │
│ created_at              │          │
└─────────────────────────┘          │
                                    │
                                    │
┌─────────────────────────┐          │
│   user_activity_log     │          │
├─────────────────────────┤          │
│ id (PK)                 │          │
│ user_id (FK)            │──────────┘
│ activity_type           │
│ resource_type           │
│ resource_id             │
│ metadata                │
│ ip_address              │
│ user_agent              │
│ session_id              │
│ created_at              │
└─────────────────────────┘
```

## Relationship Details

### Core User Data Relationships

1. **unified_profiles (1) ←→ (M) transactions**
   - A user can have multiple transactions
   - Each transaction belongs to one user
   - Foreign Key: `transactions.user_id` references `unified_profiles.id`

2. **unified_profiles (1) ←→ (M) enrollments**
   - A user can have multiple enrollments
   - Each enrollment belongs to one user
   - Foreign Key: `enrollments.user_id` references `unified_profiles.id`

3. **transactions (1) ←→ (M) enrollments**
   - A transaction can generate multiple enrollments
   - Each enrollment is typically linked to one transaction
   - Foreign Key: `enrollments.transaction_id` references `transactions.id`

4. **courses (1) ←→ (M) enrollments**
   - A course can have multiple enrollments
   - Each enrollment is for one course
   - Foreign Key: `enrollments.course_id` references `courses.id`

### Shopify Integration Relationships

5. **unified_profiles (1) ←→ (1) shopify_customers**
   - A unified profile can be linked to one Shopify customer
   - Each Shopify customer is linked to one unified profile
   - Foreign Key: `shopify_customers.unified_profile_id` references `unified_profiles.id`

6. **shopify_customers (1) ←→ (M) shopify_orders**
   - A Shopify customer can have multiple orders
   - Each order belongs to one customer
   - Foreign Key: `shopify_orders.customer_id` references `shopify_customers.id`

7. **shopify_orders (1) ←→ (M) shopify_order_items**
   - An order can have multiple line items
   - Each line item belongs to one order
   - Foreign Key: `shopify_order_items.order_id` references `shopify_orders.id`

8. **shopify_products (1) ←→ (M) shopify_order_items**
   - A product can appear in multiple order items
   - Each order item refers to one product
   - Foreign Key: `shopify_order_items.product_id` references `shopify_products.id`

### Admin-Specific Relationships

9. **unified_profiles (1) ←→ (M) user_notes**
   - A user can have multiple notes
   - Each note is about one user
   - Foreign Key: `user_notes.user_id` references `unified_profiles.id`

10. **unified_profiles (1) ←→ (M) user_notes (as admin)**
    - An admin (who is also a user) can create multiple notes
    - Each note is created by one admin
    - Foreign Key: `user_notes.admin_id` references `unified_profiles.id`

11. **unified_profiles (1) ←→ (M) admin_audit_log (as admin)**
    - An admin can perform multiple actions that are logged
    - Each log entry is associated with one admin
    - Foreign Key: `admin_audit_log.admin_id` references `unified_profiles.id`

12. **unified_profiles (1) ←→ (M) admin_audit_log (as affected user)**
    - A user can be affected by multiple admin actions
    - Each log entry can affect one user (or none)
    - Foreign Key: `admin_audit_log.user_id` references `unified_profiles.id`

13. **unified_profiles (1) ←→ (M) user_activity_log**
    - A user can have multiple activity log entries
    - Each activity log entry is associated with one user
    - Foreign Key: `user_activity_log.user_id` references `unified_profiles.id`

## Views and Their Relationships

1. **revenue_analysis_view**
   - Combines data from `transactions` and `shopify_orders`
   - Links to `unified_profiles` through `transactions.user_id` and `shopify_customers.unified_profile_id`

2. **user_purchase_history_view**
   - Combines data from `transactions` and `shopify_orders`
   - Links directly to `unified_profiles` through `user_id`

3. **marketing_performance_view**
   - Combines data from ad spend tables, `enrollments`, and `transactions`
   - Links to `unified_profiles` through `enrollments.user_id`

## Cardinality Summary

| Relationship | Cardinality | Description |
|--------------|-------------|-------------|
| unified_profiles → transactions | 1:M | One user can have many transactions |
| unified_profiles → enrollments | 1:M | One user can have many enrollments |
| transactions → enrollments | 1:M | One transaction can create many enrollments |
| courses → enrollments | 1:M | One course can have many enrollments |
| unified_profiles → shopify_customers | 1:1 | One user maps to one Shopify customer |
| shopify_customers → shopify_orders | 1:M | One customer can have many orders |
| shopify_orders → shopify_order_items | 1:M | One order can have many line items |
| shopify_products → shopify_order_items | 1:M | One product can be in many order items |
| unified_profiles → user_notes | 1:M | One user can have many notes |
| unified_profiles → user_notes (as admin) | 1:M | One admin can create many notes |
| unified_profiles → admin_audit_log (as admin) | 1:M | One admin can have many audit log entries |
| unified_profiles → admin_audit_log (as user) | 1:M | One user can be affected by many admin actions |
| unified_profiles → user_activity_log | 1:M | One user can have many activity log entries |

## Conclusion

This Entity Relationship Diagram provides a comprehensive view of the user-related tables in the Graceful Homeschooling database. The diagram illustrates how the core user data (profiles, transactions, enrollments) relates to the Shopify integration tables and the newly added admin-specific tables. This understanding is essential for implementing the admin user management system, as it ensures that all components work together coherently and that data integrity is maintained across the system.

The ERD highlights several key aspects of the data model:

1. The central role of the `unified_profiles` table in connecting all user-related data
2. The separation of transaction data between Xendit (`transactions`) and Shopify (`shopify_orders`)
3. The relationship between transactions and enrollments for course access
4. The new admin-specific tables for notes, audit logging, and activity tracking

This data model provides a solid foundation for the admin user management system, enabling comprehensive user management, reporting, and analysis.
