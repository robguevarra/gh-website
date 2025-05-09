# EmailTemplatesManager UI - Phase 1: Component Integration and Review (2025-05-08)

## 1. Task Objective
To fully integrate and refine the `EmailTemplatesManager` component (`app/admin/email-templates/email-templates-manager.tsx`) as the primary interface for managing email templates with Unlayer. This involves ensuring the component is correctly rendered on the admin page, understanding its internal workings, and aligning its functionality with project requirements for Unlayer integration.

## 2. Current State Assessment
- The `EmailTemplatesManager` component has been developed and provides a comprehensive client-side solution for listing, creating (from predefined Unlayer designs), editing (with Unlayer), previewing, testing, and versioning email templates.
- It utilizes the "On Your Own Servers" approach for Unlayer, storing template design JSON and HTML in the application's database via backend APIs.
- The main admin page `app/admin/email-templates/page.tsx` has been updated to perform an admin check and then render the `EmailTemplatesManager` component.
- Backend API routes for CRUD operations (`/api/admin/email-templates` for GET, POST, PUT, PATCH; `/api/admin/email-templates/[id]/route.ts` for DELETE, PUT [rename]; and `/api/admin/email-templates/[id]/duplicate/route.ts` for POST [duplicate]) have been established.

## 3. Future State Goal
- A fully operational and understood `EmailTemplatesManager` component that seamlessly integrates the Unlayer editor.
- All intended template management functionalities (List, Create, Edit with Unlayer, Save HTML & Design JSON, Preview, Test, Versioning, Delete, Rename, Duplicate) are either confirmed to be present in the component or planned for addition.
- The component's interaction with backend APIs and Unlayer's own methods (e.g., `unlayer.loadDesign`, `unlayerExportHtml`, `unlayerPreview`) is clear.
- The component adheres to industry best practices and project-specific coding standards.

## 4. Implementation Plan & Review Points

### Step 1: Initial Integration & Rendering (Completed)
- [x] Updated `app/admin/email-templates/page.tsx` to perform admin checks.
- [x] `page.tsx` now renders `EmailTemplatesManager` as its primary content.
- [x] Corrected import paths for `EmailTemplatesManager`.

### Step 2: Deep Dive into `EmailTemplatesManager` Component (Completed)
- [x] Analyzed state management (`useState` hooks for templates, editor content, views, etc.).
- [x] Reviewed data fetching logic and API interactions (GET, POST, PUT, PATCH calls).
- [x] Understood Unlayer editor integration:
    - [x] Use of `UnlayerEmailEditor` wrapper.
    - [x] Passing `initialHtml` and `initialDesign` to the editor.
    - [x] Handling `onSave` (receiving HTML & design JSON) and `onPreview` callbacks.
    - [x] Use of Unlayer's global methods (`unlayerExportHtml`, `unlayerPreview`) via `window`.
    - [x] Preparation of merge tags for Unlayer.
- [x] Mapped out view management (`'list'`, `'edit'`, `'preview'`, `'test'`).
- [x] Understood helper functions for variable suggestions and merge tags.
- [x] Acknowledged version management capabilities.

### Step 3: Verify Core Functionality (Ongoing & To Be Confirmed)
- **List View:**
    - [x] Templates are fetched and displayed in a table.
    - [x] Search functionality is present.
    - [x] Category filtering is present.
- **Create New Template:**
    - [x] "New Template" dialog allows selection from `unlayerTemplates` (predefined designs).
    - [x] A new template record is created via API (POST to `/api/admin/email-templates`), storing the base Unlayer `design` JSON.
    - [x] User is taken to the 'edit' view for the new template.
- **Edit View (Unlayer Integration):**
    - [x] `UnlayerEmailEditor` is loaded with `initialHtml` and `initialDesign` for the selected template.
    - [x] Changes made in Unlayer trigger `onSave` which updates component state (`editedHtml`, `designJson`).
    - [x] "Save" button calls `saveTemplate` or `saveTemplateWithVersion` (PUT to `/api/admin/email-templates`), sending HTML and Unlayer design JSON.
    - [x] Keyboard shortcut `Ctrl+S`/`Cmd+S` triggers save.
- **Preview View:**
    - [x] "Preview" button in editor likely triggers Unlayer's internal preview or custom preview logic.
    - [x] `previewTemplate` function (PATCH to `/api/admin/email-templates`) sends HTML and variables for server-side rendering (if Unlayer's direct preview isn't used).
    - [x] `TemplatePreview` component displays the result.
- **Test Send View:**
    - [x] `TemplateTester` component facilitates sending the current template to a test email address.
- **Version Management:**
    - [x] `saveTemplateWithVersion` correctly archives previous versions.
    - [x] `restoreVersion` allows loading a previous version's content into the editor.

### Step 4: Implement Missing Management Features (To Do)
- **Delete Template:**
    - [x] Add "Delete" button to the template list view for each template (via DropdownMenu).
    - [x] Implement client-side logic to call `DELETE /api/admin/email-templates/[id]`.
    - [x] Add confirmation dialog before deletion.
    - [x] Update template list on successful deletion.
- **Rename Template:**
    - [x] Add "Rename" functionality (via DropdownMenu and a dialog).
    - [x] Implement client-side logic to call `PUT /api/admin/email-templates/[id]` with the new name.
    - [x] Update template list on successful rename.
- **Duplicate Template:**
    - [x] Add "Duplicate" button to the template list view (via DropdownMenu).
    - [x] Implement client-side logic to call `POST /api/admin/email-templates/[id]/duplicate`.
    - [x] Update template list on successful duplication.

### Step 5: Code Review and Refinements
- [ ] Review for adherence to DRY principles.
- [ ] Check for clarity in variable naming and comments.
- [ ] Ensure robust error handling and user feedback (e.g., toasts).
- [ ] Verify responsive design of the manager UI itself.
- [ ] Confirm accessibility considerations.

## 5. Dependencies
- `app/admin/email-templates/unlayer-email-editor.tsx` (Assumed wrapper for Unlayer)
- `app/admin/email-templates/template-preview.tsx`
- `app/admin/email-templates/template-tester.tsx`
- `@/lib/services/email/unlayer-templates/index` (Predefined Unlayer designs)
- API routes: `/api/admin/email-templates` and its dynamic segments.

### Step 6: Final Testing & Documentation (To Do)
- [ ] Complete end-to-end testing of the `EmailTemplatesManager`.
- [ ] Document known limitations or behavior considerations.
- [ ] Prepare user documentation with screenshots.
- [ ] Record a brief demo video for admin users.

### Step 7: Template Formatting Fixes (Completed)
- [x] Fixed issue with literal "\n" characters appearing in email templates.
- [x] Updated template creation process to ensure proper HTML line breaks are used.
- [x] Refactored several templates with proper HTML formatting:
  - [x] Newsletter template
  - [x] Password Reset template
  - [x] New Course Announcement template
  - [x] Course Completion Certificate template
  - [x] Payment Confirmation template
- [x] Ensured all templates have both properly formatted HTML and plain text versions.
- [x] Tested templates to confirm formatting appears correctly when rendered.

## 6. Notes
- The component currently relies on Unlayer editor methods (`unlayerExportHtml`, `unlayerPreview`) being available on the `window` object. Ensure the `UnlayerEmailEditor` wrapper correctly initializes and exposes these if needed, or handles these interactions internally.
- The "Delete", "Rename", and "Duplicate" functionalities, while having backend API routes, are not yet implemented in the `EmailTemplatesManager` frontend UI.
- The existing `EmailTemplateList.tsx` in `components/admin/email-templates/` seems to be superseded by the list view logic within `EmailTemplatesManager.tsx`. This earlier component may need to be deprecated or removed if its functionality is fully covered.

---
*(This build note will be updated as we dissect and enhance the component.)* 