# Email System - Phase 3: CampaignDetail.tsx Refactoring Plan

## Task Objective
To refactor the `app/admin/email/campaigns/components/campaign-detail.tsx` component, significantly reducing its size and complexity by breaking it down into smaller, more manageable, and focused components. This will improve maintainability, readability, and adherence to project standards (keeping files under 150-200 lines).

## Current State Assessment
The `CampaignDetail.tsx` component is currently a monolithic file exceeding 1800 lines. It handles a wide array of functionalities related to email campaign management:
- Fetching and displaying campaign details, analytics, and associated segments.
- Managing local campaign state (name, subject, HTML content, JSON design) often via `useCampaignStore`.
- Integrating the Unlayer email editor for visual content creation and modification.
- Rendering UI for template selection, audience segment management (including selection and audience size estimation).
- Providing features for test sends, live previews of email content, and recipient previews.
- Implementing scheduling and immediate sending of campaigns.
- Managing and rendering multiple modal dialogs for user interactions (Test Send, Live Preview, Recipient Preview, Template Selection, Send Confirmation, Scheduling).
- Organizing features into a tabbed interface (Overview, Content, Targeting, Review & Send, Analytics).

This large size and a multitude of responsibilities make the component difficult to navigate, debug, and extend. It also deviates from the project's file size guidelines.

## Future State Goal
A refactored `CampaignDetail.tsx` that serves primarily as an orchestrator for various sub-components. The primary goals are:
- **Reduced Complexity:** `CampaignDetail.tsx` will be significantly smaller and easier to understand.
- **Improved Modularity:** Functionality will be encapsulated in separate, well-defined components (e.g., for each tab's content, each modal).
- **Better Maintainability:** Smaller, focused components are easier to modify and test.
- **Adherence to Standards:** The codebase will better align with file size and single-responsibility principles.
- **Clear Data Flow:** Props and state management interactions (with `useCampaignStore`) will be clearly defined for each new component.

## Implementation Plan

### 1. Modal Extraction
   - **Action:** Extract each modal dialog currently defined or used within `CampaignDetail.tsx` into its own dedicated component file.
   - **Location:** Create a new directory: `app/admin/email/campaigns/components/modals/`.
   - **Target Modals & New Files (Examples):**
     - [x] `test-send-modal.tsx` (from the inline `CampaignTestSendModal`)
     - [x] `live-preview-modal.tsx` (from the inline `LivePreviewModal`)
     - [x] `schedule-modal.tsx` (from the scheduling dialog logic)
     - [x] `send-confirmation-modal.tsx` (from the send confirmation dialog logic)
     - [x] Review `RecipientPreviewModal.tsx` and `TemplateSelectionModal.tsx` for integration and prop clarity if they are already separate files.
   - **Process:**
     - Define explicit props for each modal (e.g., `isOpen`, `onClose`, `campaignId`, relevant data slices, callback functions).
     - Import and utilize these new modal components within the main `CampaignDetail.tsx` or relevant newly created tab components.

### 2. Tab Content Extraction
   - **Action:** Isolate the content of each `TabsTrigger` and its corresponding `TabsContent` block into its own dedicated component.
   - **Location:** Create a new directory: `app/admin/email/campaigns/components/tabs/`.
   - **Target Tabs & New Files (Examples):**
     - [x] `overview-tab-content.tsx`
     - [x] `content-tab-content.tsx` (This will include the Unlayer editor and template selection logic)
     - [x] `audience-tab-content.tsx` (For segment selection and audience size display)
     - [x] `review-send-tab-content.tsx` (For campaign summary and final action buttons)
     - [ ] `analytics-tab-content.tsx` (If analytics are complex enough to warrant separation) -> (Decided not needed for now, analytics are in Overview tab)
   - **Process:**
     - [x] Identify the JSX and specific logic for each tab.
     - [x] Define clear props for each new tab component (data, state, handlers).
     - [x] Move the relevant JSX and logic to the new component files.
     - [x] Update `CampaignDetail.tsx` to import and use these new tab components, passing the required props.
   - **Considerations for Prop Drilling / State Management:**
     - [x] Initially, state and complex handlers (especially those interacting with Unlayer or Zustand store actions like `fetchCampaign`, `updateCampaign`, `sendCampaign`, segment actions) will remain in `CampaignDetail.tsx` and be passed down as props. This simplifies the initial refactor.
     - [ ] Future Refinement: Evaluate if some state/handlers can be further localized to the new tab components or if a more targeted state management solution (e.g., Zustand slices specific to editor or audience) would be beneficial for deeply nested props. (Defer this to a later stage if initial prop drilling is manageable).

### 3. Hook & Utility Consolidation/Review
   - **Action:** Review remaining logic within `CampaignDetail.tsx` and within the newly extracted components for opportunities to create custom hooks or ensure utility functions are centralized.
   - **Process:**
     - [x] **Editor Logic:** Consolidate Unlayer editor interactions (e.g., `handleEditorLoad`, `resetEditor`, `getUnlayerContent`, `unlayerEditorRef` management) within `content-tab-content.tsx`. If still complex, consider a custom hook like `useUnlayerEditor`.
     - [x] **Variable Utilities:**
       - Audit the existing `extractVariablesFromContent`, `substituteVariables`, `generateDefaultVariableValues` functions within `CampaignDetail.tsx`.
       - Ensure alignment with the standardized `getStandardVariableDefaults` (from `lib/services/email/template-utils.ts`) and the `{{snake_case}}` variable syntax as per `email-system_phase-3_advanced-features-and-ux-polish.md`.
       - Centralize these utilities in `lib/services/email/template-utils.ts` if not already done, and ensure all components (modals, tabs) use the standardized versions.
     - [x] **Validation Logic:** The `validateCampaign` function should likely reside within or be closely associated with `review-send-tab-content.tsx`.

### 4. Main `CampaignDetail.tsx` Cleanup - [x]
   - **Action:** Refine `CampaignDetail.tsx` to primarily serve as a high-level layout and state orchestrator.
   - **Process:**
     - [x] It will continue to handle initial data fetching (e.g., `fetchCampaign`, `fetchCampaignAnalytics`).
     - [x] It will render the main page structure, including the `Tabs` component, and instantiate the new tab and modal components.
     - [x] State directly tied to the functionality of a specific extracted tab or modal should be managed within that child component, or via `useCampaignStore` if more global.
     - [x] Ensure clear and minimal props are passed to child components.

### 5. Adherence to Phase 3 Build Note (`email-system_phase-3_advanced-features-and-ux-polish.md`) - [x] (pending UI check)
   - **Cross-Cutting Concerns:**
     - [x] **Variable Standardization:** Throughout the refactoring, ensure all variable handling (previews, test sends, displays) strictly adheres to the `{{snake_case}}` convention and uses the standardized utilities. This is a key requirement from Task 1.B of the referenced build note.
     - [x] **State Management (`useCampaignStore`):** Carefully manage how data and actions from `useCampaignStore` are accessed or passed to the new, smaller components. The goal is to maintain clarity and avoid prop-drilling where direct store usage by a child component is more appropriate.
     - [ ] **UI Enhancements:** As components are extracted (especially tab contents), incorporate any pending UI enhancements detailed in the main Phase 3 build note (e.g., for advanced targeting in `targeting-tab-content.tsx`, or the review steps in `review-send-tab-content.tsx`). (Requires checking the other build note)

## Next Steps
Once this refactoring plan build note is established, the next step will be to begin implementing the "Modal Extraction" phase. 