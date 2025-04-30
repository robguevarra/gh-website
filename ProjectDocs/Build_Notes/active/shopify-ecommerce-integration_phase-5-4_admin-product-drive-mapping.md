# Shopify E-commerce Integration - Phase 5-4: Admin Product-Drive Mapping

## Task Objective
Create a simple administrative interface within the `/admin` section that allows administrators to associate Shopify products with Google Drive folders by updating the `google_drive_file_id` column in the `shopify_products` table. This straightforward mapping is essential for granting customers access to purchased digital content after checkout.

## Current State Assessment
- The Shopify integration is largely complete with Phase 5-0 (Strategy), 5-1 (Backend Setup), 5-2 (Frontend Product Display & Cart), and 5-3 (Checkout & Payment Integration).
- The `shopify_products` table contains a `google_drive_file_id` column which was added in Phase 5-1, but there's no user-friendly way to populate it.
- Currently, the Google Drive mapping must be done manually through database updates, making it cumbersome and prone to errors.
- After a successful purchase, the system needs the `google_drive_file_id` to grant the customer access to the respective Google Drive resource.
- During Phase 5-3, the Google Drive permission granting functionality was implemented (`grantFilePermission` function in `lib/google-drive/driveApiUtils.ts`).
- The admin sidebar already contains a "Shop Integration" link at `/admin/shop` with a ShoppingBag icon, which we can leverage for this implementation.

## Future State Goal
1. **Simple Admin Interface:** A straightforward page within the `/admin` area that lists all Shopify products and allows admins to set or update their Google Drive folder IDs.
2. **Efficient Editing:** Enable direct editing of the Google Drive file ID field for each product.
3. **Clear Display:** Show essential product information (name, SKU, price) alongside the Google Drive mapping field.
4. **Basic Validation:** Simple format validation for Google Drive IDs.
5. **User Feedback:** Clear success/error messages after updates.

## Relevant Context

> **Important**: When working on this build note, always ensure proper context integration from:
> 1. Phase 5-0: Strategy & Architecture - Defines the overall e-commerce integration approach.
> 2. Phase 5-1: Backend Setup - Specifies the `shopify_products` table structure including the `google_drive_file_id` column.
> 3. Phase 5-3: Checkout & Payment Integration - Contains the Google Drive permission granting logic.
> 4. Project Context (`ProjectContext.md`) - Defines tech stack, goals, PWA structure.
> 5. Design Context (`designContext.md`) - Defines UI/UX standards.
> 6. Build Notes Guidelines (`build-notes-guidelines.md`) - Defines documentation standards.
>
> This ensures consistency and alignment with project goals and standards.

### From Previously Completed Phases

#### Phase 5-1: Backend Setup
- Added the `google_drive_file_id` column to the `shopify_products` table
- Enhanced the Shopify product sync to include image data

#### Phase 5-3: Checkout & Payment Integration
- Implemented `grantFilePermission` in `lib/google-drive/driveApiUtils.ts`
- Created logic to use the `google_drive_file_id` to grant permissions after successful purchase
- Noted that Google Drive mappings were being manually managed as a temporary solution

## Implementation Plan (Phase 5-4)

1. [x] **Create Admin Product List View:**
   - [x] Create or enhance the existing shop page at (`app/admin/shop/page.tsx`)
   - [x] Add a new "Product Drive Mapping" section or tab if needed
   - [x] Implement server component to fetch all products from `shopify_products` table
   - [x] Design a simple table layout showing product title, SKU, price, and current Google Drive mapping
   - [x] Add basic filtering to find products by name or SKU
   - [x] Add a "Copy Google Drive ID" button to make it easy to check existing mappings

2. [x] **Implement Product Mapping Interface:**
   - [x] Create an inline editing component for the Google Drive ID column
   - [x] Implement a simple text input field for entering Drive IDs
   - [x] Add a save button for each row
   - [x] Provide visual feedback for successful updates

3. [x] **Create Server Action for Updates:**
   - [x] Create a simple server action (`app/actions/updateProductDriveId.ts`)
   - [x] Implement a function to update the `google_drive_file_id` for a product
   - [x] Add Google Drive ID parsing functionality: 
     - [x] Detect if input is a full URL (e.g., `https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz12345` or other variations)
     - [x] Extract just the ID portion (e.g., `1AbCdEfGhIjKlMnOpQrStUvWxYz12345`)
     - [x] Store only the parsed ID in the database
   - [x] Add basic input validation (format check)
   - [x] Return appropriate success/error messages

4. [x] **Add User Feedback:**
   - [x] Implement loading states during updates
   - [x] Show success/error toasts after operations complete
   - [x] Add visual indicators for products without mappings

## Technical Considerations

### Security
- Ensure proper authorization checks for admin routes
- Basic validation for Drive ID format (looks like a valid Google ID)
- Implement robust URL parsing to extract the correct Drive ID from various URL formats
- Confirm RLS policies prevent unauthorized access to product data

### User Experience
- Keep the interface simple and focused
- Use inline editing for efficiency
- Accept both direct IDs and full Google Drive URLs
- Show a visual example of where to find the Google Drive ID
- Provide immediate feedback after updates
- Support keyboard navigation for quick editing of multiple entries

### Data Integrity
- Verify successful database updates
- Implement simple error handling

## Completion Status

This phase (5-4) is now complete:
- Administrators can view all Shopify products in a simple list via the Shop Integration page
- Admins can directly edit the Google Drive ID for any product with inline editing
- Updates are saved correctly to the database with proper validation
- The interface provides clear feedback on success/failure through toast notifications
- Basic validation ensures data quality by checking Drive ID format
- URL parsing automatically extracts the correct ID from full Google Drive URLs

## Next Steps After Completion

After establishing the admin product-drive mapping interface, next steps include:
1. Testing the full e-commerce flow with properly mapped products
2. Verifying successful permission granting with the Xendit webhook
3. Providing simple documentation for administrators on how to find Google Drive IDs and use the interface
4. Considering adding a feature to test/verify that the Google Drive permissions can be granted to a test account before going live

---

> **Note to AI Developers**: When working on this project, always ensure that you:
> 1. Review previously completed build notes for context and established patterns
> 2. Consult the implementation strategy and architecture planning documents
> 3. Align your work with the project context and design context guidelines
> 4. Follow the established folder structure, naming conventions, and coding standards
> 5. Include this reminder in all future build notes to maintain consistency
