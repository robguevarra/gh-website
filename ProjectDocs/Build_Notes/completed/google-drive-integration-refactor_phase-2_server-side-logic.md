# Build Notes: Google Drive Integration Refactor - Phase 2: Server-Side Logic

**Date:** 2025-04-12

**Phase 1 Reference:** [google-drive-integration-refactor_phase-1_planning-and-design.md](./google-drive-integration-refactor_phase-1_planning-and-design.md)

## Task Objective

Implement the core server-side logic required to interact with the Google Drive API for the refactored template browser. This involves creating a dedicated utility module (`DriveApiUtils`) responsible for authentication, fetching folder contents, retrieving folder hierarchy (for breadcrumbs), and processing the data into a usable format for the frontend components.

## Current State Assessment

-   Phase 1 planning is complete, defining the technical approach (RSC, URL Params) and requirements.
-   An existing API route (`/app/api/google-drive/route.ts`) handles fetching for a single hardcoded folder ID using the `googleapis` library and service account authentication (via key file path).
-   Secrets handling logic for production (reading JSON from env var) is not yet implemented.
-   No logic exists to fetch folder hierarchy/path information.

## Future State Goal

-   A reusable server-side module (`lib/google-drive/driveApiUtils.ts` or similar path) containing all Google Drive API interaction logic.
-   The module correctly authenticates using either the local key file path (dev) or the JSON content from an environment variable (prod).
-   A function within the module accepts a `folderId` (string, or null/empty for root) and returns the list of files and folders within that folder, including an `isFolder` flag and necessary metadata (id, name, mimeType, modifiedTime).
-   A function (or enhancement to the previous one) that retrieves the path/breadcrumb information for a given `folderId` (e.g., an array of `{ id, name }` objects representing the path from the root).
-   Robust error handling for API calls.

## Implementation Plan (Phase 2: Server-Side Logic)

1.  [x] **Create Module Structure:**
    -   [x] Create the directory `lib/google-drive/` if it doesn't exist.
    -   [x] Create the file `lib/google-drive/driveApiUtils.ts`.
    -   [x] Define necessary TypeScript types/interfaces (e.g., `DriveItem`, `BreadcrumbSegment`).
2.  [x] **Implement Authentication Logic:**
    -   [x] Create a function `getGoogleAuthClient()` that encapsulates the authentication logic.
    -   [x] Implement the check for `process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON` vs. `process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH`.
    -   [x] Handle parsing of JSON content or resolving file path.
    -   [x] Return an authenticated `google.auth.GoogleAuth` client instance.
    -   [x] Add error handling for invalid credentials or missing configuration.
3.  [x] **Implement `getFolderContents` Function:**
    -   [x] Define function signature: `async function getFolderContents(folderId: string | null): Promise<DriveItem[]>`.
    -   [x] Use the auth client to create a `drive` API instance.
    -   [x] Handle the `folderId` parameter (use 'root' alias or the actual root folder ID from env var if `folderId` is null/empty).
    -   [x] Call `drive.files.list` with appropriate query (`'folderId' in parents`, `trashed=false`) and fields (`id`, `name`, `mimeType`, `modifiedTime`, etc.).
    -   [x] Process the results: map API response to `DriveItem` interface, setting `isFolder = (mimeType === 'application/vnd.google-apps.folder')`.
    -   [x] Implement basic sorting (e.g., folders first, then files, alphabetically).
    -   [x] Add error handling for the API call.
4.  [x] **Implement `getFolderPath` Function (for Breadcrumbs):**
    -   [x] Define function signature: `async function getFolderPath(folderId: string): Promise<BreadcrumbSegment[]>`.
    -   [x] Strategy Implemented: Iterative fetching of parent details until root is reached.
        -   Start with the given `folderId`.
        -   Repeatedly call `drive.files.get` with `fields=id,name,parents` for the current folder ID.
        -   Extract the `name` and `id`.
        -   Get the `parents[0]` ID (assuming single parent structure for simplicity) and repeat until the configured root folder is reached or no parent is found.
        -   Build the path array using `unshift`.
    -   [x] Handle the root folder case (stops iteration at configured root).
    -   [ ] Add caching if performance becomes an issue (can be added later).
    -   [x] Add error handling.
5.  [ ] **Refine and Test:**
    -   [x] Add JSDoc comments (Done during implementation).
    -   [ ] Perform basic tests (manual or unit tests if setup) to ensure functions work as expected with different folder IDs and edge cases (empty folder, root folder). (Partially done by integrating into API route).
