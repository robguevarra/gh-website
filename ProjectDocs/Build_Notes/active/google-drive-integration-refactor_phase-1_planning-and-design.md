# Build Notes: Google Drive Integration Refactor - Phase 1: Planning and Design

**Date:** 2025-04-12

## Task Objective

To refactor the existing Google Drive template browser component and its associated API route within the dashboard. The goal is to improve usability, implement hierarchical folder navigation, enhance UI/UX according to best practices, ensure clear distinction between files and folders, and improve backend robustness and potentially performance.

## Current State Assessment

-   The current implementation fetches files from a single, predefined Google Drive folder ID specified in the environment variables.
-   The API route (`/api/google-drive`) uses a Service Account for authentication via the `googleapis` library.
-   The frontend component (`TemplateBrowser`) displays all fetched items as files, without distinguishing folders.
-   Clicking an item attempts to open it in the `GoogleDriveViewer` modal, which only works for previewable file types.
-   Navigation is limited to the single root folder.
-   UI is basic, lacking features like folder icons, sorting, or different view modes.
-   Potential performance bottlenecks if the folder contains a very large number of items.
-   Secrets management for production uses environment variables, but the API route hasn't been updated yet to read JSON content directly from env vars (currently relies on file path).

## Future State Goal

-   Users can navigate through the folder hierarchy within the shared Google Drive folder.
-   Clear visual distinction between files and folders (e.g., using icons).
-   Clicking a folder navigates into that folder.
-   Clicking a file opens the preview modal (as currently implemented, but only for actual files).
-   Breadcrumb navigation to show the current path and allow easy navigation back up the hierarchy.
-   Improved UI/UX (potential features: list/grid view toggle, sorting options by name/date).
-   Robust backend API capable of fetching contents of specific folders within the hierarchy.
-   Optimized data fetching, potentially leveraging Next.js App Router capabilities (RSC, Server Actions, or refined API routes).
-   Clean, maintainable, and well-structured code following project guidelines (functional, typed, modular).
-   API route handles both local key file path (dev) and JSON content from env var (prod).

## Implementation Plan (Phase 1: Planning & Design)

1.  [x] **Define Detailed Requirements:**
    -   [x] UI/UX Features Confirmed:
        -   Distinct folder/file icons (`lucide-react`).
        -   Breadcrumbs (e.g., `Root > Folder A > ...`).
        -   Sorting by Name and Modified Date (Asc/Desc).
        -   List view is sufficient for now.
    -   [x] Functionality Confirmed:
        -   Clicking folders navigates into them.
        -   Clicking files opens preview modal.
        -   Root folder is the one defined by `GOOGLE_DRIVE_LINK`.
    -   [x] API Confirmed:
        -   Single API endpoint/logic accepting `folderId` (null/empty for root).
        -   Response includes `id`, `name`, `mimeType`, `modifiedTime`, derived `isFolder`.
2.  [x] **Technical Design:**
    -   [x] **Data Fetching Strategy:** React Server Components (RSC).
        -   *Rationale:* Aligns with Next.js 15 App Router best practices and the project's emphasis on server-side logic (`projectContext.md`). Simplifies data fetching by co-locating it with the rendering component on the server. Eliminates the need for client-side loading states for the initial list view.
    -   [x] **State Management (Navigation):** URL Search Parameters (e.g., `?folderId=...`, `?sortBy=...`).
        -   *Rationale:* Most idiomatic approach for navigation state within the App Router. Makes the browser state inherently shareable and bookmarkable. Integrates seamlessly with RSCs, as changes to search params trigger re-renders and data fetches. Avoids introducing client-side state complexity (potentially via Zustand) for core navigation, reserving Zustand for more intricate client-side UI state if needed elsewhere, aligning with lessons learned from previous dashboard state optimizations.
    -   [x] **Component Structure:**
        -   `DriveBrowser` (RSC): Main container, receives `folderId` and sorting params from `searchParams`, fetches data, renders `Breadcrumbs` and `ItemList`.
        -   `Breadcrumbs` (Client Component): Receives path information (fetched by `DriveBrowser`), renders navigation links using `next/link` to update `folderId` param.
        -   `ItemList` (RSC or Client): Receives sorted list of files/folders from `DriveBrowser`, maps over items rendering `FileItem` or `FolderItem`.
        -   `FileItem` / `FolderItem` (Client Components): Display item details (icon, name, etc.). Handle clicks - `FolderItem` uses `useRouter` to navigate with new `folderId`, `FileItem` triggers preview modal.
        -   `SortControls` (Client Component): Renders dropdowns/buttons to change sorting, uses `useRouter` to update `sortBy`/`sortDir` search params.
        -   `DriveApiUtils` (Server-side module): Contains the logic to interact with the Google Drive API using `googleapis`, handles authentication (including secrets logic), and fetching folder contents/hierarchy.
    -   [x] **Error Handling:**
        -   Server-side fetch logic (`DriveApiUtils`) will handle Google API errors (permissions, not found, rate limits) and log them.
        -   RSCs can use `try/catch` and potentially render specific error UI components if fetching fails.
        -   Next.js `error.tsx` conventions can be used for unhandled errors during rendering.
        -   Client components handle UI interaction errors (e.g., failed navigation click).
    -   [x] **Production Secrets Handling:**
        -   The server-side `DriveApiUtils` module will implement the logic:
            -   Check for `process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON`.
            -   If present (production), parse the JSON content directly to authenticate `googleapis`.
            -   If not present (development), use `process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH` to load the key file.
3.  [ ] **Review & Refine Plan:**
    -   [ ] Review the defined requirements and technical design.
    -   [ ] Estimate effort/complexity for subsequent implementation phases.
    -   [ ] Prepare for Phase 2: Backend API Implementation.
