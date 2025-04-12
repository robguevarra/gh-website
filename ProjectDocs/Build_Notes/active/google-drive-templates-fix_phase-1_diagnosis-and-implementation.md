# Build Notes: Google Drive Templates Fix - Phase 1: Diagnosis and Implementation

**Task Objective:** Diagnose and fix the issues preventing the Google Drive viewer from loading correctly in the "Free Templates" section of the dashboard (`app/dashboard/page.tsx`). Implement a robust and secure solution using best practices.

**Current State Assessment:**
- The "Free Templates" section exists in `app/dashboard/page.tsx`.
- An attempt to integrate Google Drive viewing is present but malfunctioning.
- Errors are reported, and the viewer isn't loading.
- Necessary API keys and Google Drive links are available.

**Future State Goal:**
- The "Free Templates" section correctly displays content from Google Drive.
- The implementation is secure, potentially using backend API routes to handle sensitive operations or keys.
- Errors related to the Google Drive integration are resolved.

**Implementation Plan:**

1.  [x] **Step 1: Gather Error Information**
    -   [x] Obtain specific console error messages from the user (Implied: User reported viewer not loading).
    -   [x] Understand the exact failure behavior (Viewer not loading).
2.  [x] **Step 2: Code Analysis**
    -   [x] Examine `app/dashboard/page.tsx` for the "Free Templates" section implementation (Uses `TemplatesLibrarySection`, manages preview state).
    -   ~~[ ] Review `app/api/templates/route.ts` (if used) for Google Drive API interaction logic.~~ (Deprecated route)
    -   [x] Examine `components/dashboard/templates-library-section.tsx` (Uses `TemplateBrowser`).
    -   [x] Examine `components/dashboard/template-browser.tsx` (Uses `useGoogleDriveFiles` hook, passes selection up).
    -   [x] Examine `components/dashboard/template-preview-modal.tsx` (Uses `GoogleDriveViewer`, passes props correctly).
    -   [x] Examine `components/dashboard/google-drive-viewer.tsx` (Uses `iframe` with `/preview` URL, relies on public file permissions).
    -   [x] Examine `/api/google-drive/route.ts` (Uses `GOOGLE_DRIVE_API_TOKEN` to list files, `GOOGLE_DRIVE_LINK` for folder ID).
    -   [x] Check how API keys are being accessed and used (e.g., from `.env` - `GOOGLE_DRIVE_API_TOKEN` and `GOOGLE_DRIVE_LINK` used in API route).
3.  [ ] **Step 3: Identify Root Cause**
    -   [x] Determine if the issue is with embedding, API calls, authentication, file permissions, or configuration. (Most likely cause identified as Google Drive file sharing permissions for the `iframe` viewer and potential `.env` configuration issues).
4.  [ ] **Step 4: Implement Solution**
    -   [x] User confirmed file sharing permissions set to "Anyone with the link can view".
    -   [x] User updated `.env` with correct `GOOGLE_DRIVE_LINK` and `GOOGLE_DRIVE_API_TOKEN`.
    -   [x] Removed duplicate `GOOGLE_DRIVE_LINK` from `.env`.
    -   [x] Enhanced error logging in `/api/google-drive/route.ts` to capture specific API errors.
    -   [x] Added debug logging in `/api/google-drive/route.ts` GET handler to check env var values and extracted folder ID.
    -   [x] Removed faulty mock data logic from GET handler.
    -   [x] Applied TypeScript fixes (Interface definition, null checks, type safety).
    -   [x] Instructed user to manually fix mock data lint error (`thumbnail` -> `thumbnailLink`) due to tool issue.
    -   [x] Instructed user to restart Next.js dev server again after fixes.
    -   [x] Identified 401 Unauthorized error from Google Drive API logs, indicating invalid credentials (`GOOGLE_DRIVE_API_TOKEN`).
    -   [x] Discuss authentication options: API Key vs. Service Account (OAuth 2.0).
    -   [x] Switched to Service Account method.
    -   [x] Updated `.gitignore` to include key file.
    -   [x] Updated `.env` with `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`.
    -   [x] Installed `googleapis` npm package.
    -   [x] Refactored `/api/google-drive/route.ts` to use `googleapis` and Service Account auth.
    -   [x] Remind user to share Drive folder with Service Account email.
    -   [x] Instruct user to restart server and test again.
5.  [ ] **Step 5: Finalization & Best Practices**
    -   [x] Confirmed Service Account configuration in `.env` fixed the issue.
    -   [ ] Discuss secrets management best practices (.gitignore, platform env vars, handling JSON key file).
    -   [ ] Recommend adapting API route to handle both local key file path and production JSON env var.
    -   [x] Verified API call works and templates load correctly.
    -   [ ] Check server logs for detailed Google Drive API errors and [API DEBUG] messages.
    -   [x] Confirm Service Account has 'Viewer' access to the shared folder (User implied by success).
