# Build Notes: Email System Phase 2 - Template Editor Integration & Segmentation UI

## Task Objective

Integrate email template selection and management into the campaign creation/editing workflow, and develop a UI for defining and applying precise audience segments to campaigns, leveraging the existing tagging system.

## Current State Assessment

- Campaign management foundational elements (data access, API routes, basic UI) are in place.
- A functional Unlayer email template editor and management system exists in `app/admin/email-templates`.
- A tagging system infrastructure (data model, API, basic management UI) is complete.
- The `email-system-phase-2_campaign-management.md` and `email-system-phase-2_advanced-features.md` build notes outline the need for these features.

## Future State Goal

- Users can easily select and associate existing email templates with their campaigns.
- Users can create, save, name, and manage audience segments based on tags.
- Campaigns can be targeted to specific user segments for delivery.
- The Unlayer editor's specific implementation rules are respected and maintained.

## Implementation Plan

### Phase 1: Understand Existing Implementation (Code Review)

- [x] **Task 1.1:** Review `app/admin/email/page.tsx` to understand the current email campaign management workflow and UI.
- [x] **Task 1.2:** Thoroughly examine the `app/admin/email-templates` directory and its contents to understand the Unlayer editor integration, template structure, and any specific configurations or rules.
    - *Note: `template-editor.tsx` (TipTap-based) appears to be an alternative/older editor and is likely not relevant for the current Unlayer-focused integration.*

### Phase 2: Strategize and Plan Core Feature Implementation

- [ ] **Step 2.1: Template Editor Integration for Campaigns**
    - [x] **Task 2.1.1:** Define data model changes for the `campaigns` table: add `selected_template_id` (FK to `email_templates`), `campaign_html_body` (TEXT), and `campaign_design_json` (JSONB) to store template snapshots.
    - [x] **Task 2.1.2:** Design UI for selecting templates within the campaign creation/editing flow: Plan a "Choose Template" button opening a modal that lists templates with search/filter.
    - [x] **Task 2.1.3:** Plan template content handling: On selection, copy template's HTML/design to campaign fields; campaign editor works with these snapshotted fields.
    - [x] **Task 2.1.4:** Plan Unlayer editor integration in the campaign UI: Embed an Unlayer editor instance on the campaign page to load and manage `campaign_design_json`.
    - [x] **Task 2.1.5:** Resolve lint errors related to `DisplayMode` in `unlayer-email-editor.tsx`, `Badge` variants in `campaign-detail.tsx`, and type definitions in `useCampaignStore` and `EmailCampaign` type.
- [ ] **Step 2.2: Segment Targeting UI**
    - [x] **Task 2.2.1:** Review `MEMORY[e928807d-83d5-40b0-9b01-533b36e94a54]` (Tagging system completion) to ensure alignment. (Already implicitly done by referencing its content in planning).
    - [x] **Task 2.2.2:** Define data model for `segments` table (`id`, `name`, `description`, `rules` (JSONB)) and `campaign_segments` join table.
    - [ ] **Task 2.2.3:** Design UI for segment management page (`/admin/email/segmentation`): List segments, provide Create/Edit/Delete actions.
    - [ ] **Task 2.2.4:** Design UI for segment creation/editing: Include fields for name/description and a rule builder UI (conditions on tags, AND/OR logic) to construct the `rules` JSON.
    - [ ] **Task 2.2.5:** Design UI for linking segments to campaigns: Add a multi-select component on the campaign page to choose from named segments.

### Phase 3: Backend Implementation and Integration

- [ ] **Step 3.1: Campaign-Template Linking**
    - [ ] **Task 3.1.1:** Update backend API(s) to handle saving/retrieving campaign-template associations.
- [ ] **Step 3.2: Segmentation Engine Backend**
    - [ ] **Task 3.2.1:** Develop backend logic for the segmentation engine (evaluating segment rules against user tags).
    - [ ] **Task 3.2.2:** Implement API endpoints for managing segments (create, read, update, delete).
    - [ ] **Task 3.2.3:** Integrate segmentation logic with campaign delivery system (to be addressed in a later phase: "Background processing for campaign delivery").

### Phase 4: Testing and Refinement

- [ ] **Step 4.1: Template Integration Testing**
    - [ ] **Task 4.1.1:** Verify that the "Choose Template" button appears on the campaign detail page (Content tab).
    - [ ] **Task 4.1.2:** Test opening the `TemplateSelectionModal`.
    - [ ] **Task 4.1.3:** Test searching and selecting a template from the modal.
    - [ ] **Task 4.1.4:** Verify that upon template selection, the `campaign_html_body` and `campaign_design_json` fields in the `currentCampaign` state (Zustand store) are updated.
    - [ ] **Task 4.1.5:** Verify that the Unlayer editor on the campaign detail page loads the selected template's design (`campaign_design_json`).
    - [ ] **Task 4.1.6:** Test making changes in the Unlayer editor and ensure the `editorRef.current.exportHtml` function correctly extracts the updated HTML and design JSON.
    - [ ] **Task 4.1.7:** Test saving the campaign (via the existing save mechanism) and verify that `campaign_html_body` and `campaign_design_json` are correctly persisted to the database.
    - [ ] **Task 4.1.8:** Test loading an existing campaign that has a template selected and verify the Unlayer editor loads the correct content.
- [ ] **Task 4.2:** Unit and integration tests for template selection and segment management.
- [ ] **Task 4.3:** User acceptance testing (UAT) for the new features.
- [ ] **Task 4.4:** Refine UI/UX based on feedback.

---
*Updates will be appended below this line as tasks are completed or plans evolve.*
