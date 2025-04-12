import { google, drive_v3 } from 'googleapis';
import path from 'path';

// Define the structure for items returned by our utility functions
export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null; // Ensure consistency, Drive API might return null
  isFolder: boolean;
  // Add other relevant fields if needed (e.g., webViewLink, size, thumbnailLink)
}

// Define the structure for breadcrumb segments
export interface BreadcrumbSegment {
  id: string;
  name: string;
}

// --- Authentication Logic ---

const SCOPES = ['https://www.googleapis.com/auth/drive.readonly'];

/**
 * Creates and returns an authenticated Google Auth client.
 * It prioritizes credentials from the GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON env var (for production)
 * and falls back to the GOOGLE_SERVICE_ACCOUNT_KEY_PATH env var (for development).
 * @throws {Error} If neither credential source is found or if credentials are invalid.
 */
async function getGoogleAuthClient() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON;
  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  let authOptions: any = { // Using 'any' temporarily as options differ slightly
    scopes: SCOPES,
  };

  if (credentialsJson) {
    try {
      console.log('[Auth] Using credentials from GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON');
      const credentials = JSON.parse(credentialsJson);
      authOptions.credentials = credentials;
    } catch (error) {
      console.error('[Auth Error] Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON:', error);
      throw new Error('Invalid service account credentials JSON provided in environment variable.');
    }
  } else if (keyFilePath) {
    try {
      console.log('[Auth] Using key file path from GOOGLE_SERVICE_ACCOUNT_KEY_PATH');
      const absoluteKeyFilePath = path.resolve(process.cwd(), keyFilePath);
      // You might want to add a check here to see if the file actually exists
      // import fs from 'fs';
      // if (!fs.existsSync(absoluteKeyFilePath)) {
      //   throw new Error(`Service account key file not found at path: ${absoluteKeyFilePath}`);
      // }
      authOptions.keyFile = absoluteKeyFilePath;
    } catch (error) {
      console.error('[Auth Error] Failed to resolve key file path:', error);
      throw new Error('Invalid service account key file path provided.');
    }
  } else {
    console.error('[Auth Error] Missing Google Drive credentials. Set either GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON or GOOGLE_SERVICE_ACCOUNT_KEY_PATH.');
    throw new Error('Google Drive API credentials are not configured.');
  }

  try {
    const auth = new google.auth.GoogleAuth(authOptions);
    // Optionally, test the authentication by getting a client
    // await auth.getClient(); 
    console.log('[Auth] Google Auth client configured successfully.');
    return auth;
  } catch (error) {
    console.error('[Auth Error] Failed to create Google Auth client:', error);
    throw new Error('Failed to initialize Google Drive authentication.');
  }
}

// --- Folder Contents Logic ---

const ROOT_FOLDER_ID_ENV_VAR = 'GOOGLE_DRIVE_ROOT_FOLDER_ID'; // Define the env var name

/**
 * Fetches the contents (files and folders) of a specific Google Drive folder.
 *
 * @param folderId The ID of the folder to fetch contents for. If null or empty,
 *                 fetches the root folder specified by GOOGLE_DRIVE_ROOT_FOLDER_ID env var,
 *                 or defaults to the Drive 'root' alias if the env var is not set.
 * @returns A promise that resolves to an array of DriveItem objects, sorted with folders first, then files, alphabetically.
 * @throws {Error} If authentication fails or the Google Drive API call fails.
 */
export async function getFolderContents(folderId: string | null): Promise<DriveItem[]> {
  console.log(`[DriveAPI] Fetching contents for folderId: ${folderId || '(root)'}`);
  try {
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    let targetFolderId = folderId;
    if (!targetFolderId) {
      targetFolderId = process.env[ROOT_FOLDER_ID_ENV_VAR];
      if (!targetFolderId) {
        console.warn(`[DriveAPI] ${ROOT_FOLDER_ID_ENV_VAR} not set, defaulting to 'root' alias.`);
        targetFolderId = 'root'; // Use the 'root' alias as a fallback
      } else {
         console.log(`[DriveAPI] Using root folder ID from env var: ${targetFolderId}`);
      }
    }

    const response = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed=false`,
      fields: 'files(id, name, mimeType, modifiedTime)', // Add other fields here if needed later
      orderBy: 'folder,name', // Sort by type (folders first), then by name
      pageSize: 1000, // Adjust page size as needed
    });

    const files = response.data.files;
    if (!files || files.length === 0) {
      console.log(`[DriveAPI] No files found in folder: ${targetFolderId}`);
      return [];
    }

    console.log(`[DriveAPI] Found ${files.length} items in folder: ${targetFolderId}`);

    const driveItems: DriveItem[] = files.map((file): DriveItem => ({
      id: file.id!, // Non-null assertion, assuming API always returns id
      name: file.name!, // Non-null assertion
      mimeType: file.mimeType!, // Non-null assertion
      modifiedTime: file.modifiedTime || null,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
    }));

    // Already sorted by API using orderBy: 'folder,name'
    return driveItems;

  } catch (error: any) {
    console.error(`[DriveAPI Error] Failed to fetch folder contents for ID "${folderId}":`, error.message || error);
    // Consider more specific error handling based on error codes if needed
    throw new Error(`Failed to retrieve folder contents from Google Drive. ${error.message}`);
  }
}

// --- Folder Path Logic ---

/**
 * Fetches the hierarchical path (breadcrumbs) for a given Google Drive folder ID.
 *
 * @param folderId The ID of the target folder.
 * @param rootFolderId The ID configured as the application's root (optional, uses env var or 'root').
 * @returns A promise resolving to an array of BreadcrumbSegment objects representing the path from root.
 * @throws {Error} If authentication or API calls fail, or if the folder is not found/accessible.
 */
export async function getFolderPath(
  folderId: string,
  rootFolderId?: string | null
): Promise<BreadcrumbSegment[]> {
  if (!folderId) {
    console.warn('[DriveAPI Path] Called getFolderPath with empty folderId.');
    return []; // Return empty path for null/empty input ID
  }

  console.log(`[DriveAPI Path] Fetching path for folderId: ${folderId}`);
  try {
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Determine the effective root ID to stop the recursion
    const effectiveRootId = rootFolderId || process.env[ROOT_FOLDER_ID_ENV_VAR] || 'root'; 
    console.log(`[DriveAPI Path] Using effective root ID: ${effectiveRootId}`);

    const pathSegments: BreadcrumbSegment[] = [];
    let currentFolderId: string | null | undefined = folderId;

    // Stop if we somehow reach the absolute Drive root or the configured root
    while (currentFolderId && currentFolderId !== effectiveRootId) {
      console.log(`[DriveAPI Path] Getting details for folder: ${currentFolderId}`);
      // Add explicit type for the API response
      const response: drive_v3.Schema$File | any = await drive.files.get({
        fileId: currentFolderId,
        fields: 'id, name, parents', // Request ID, name, and parent IDs
      });

      // Add explicit type for the file data
      const file: drive_v3.Schema$File = response.data;
      if (!file || !file.id || !file.name) {
        console.error(`[DriveAPI Path Error] Failed to get details for folder ID: ${currentFolderId}. Folder might not exist or permissions insufficient.`);
        // Decide if we should throw or return partial path
        // Returning partial path might be more user-friendly
        break; // Stop building the path if a folder is missing
      }

      // Add the current folder to the start of the path array
      pathSegments.unshift({ id: file.id, name: file.name });

      // Move to the parent folder
      if (file.parents && file.parents.length > 0) {
        currentFolderId = file.parents[0]; // Assume single parent
         // Check if the parent is the effective root, if so, add root and stop
        if (currentFolderId === effectiveRootId) {
          console.log('[DriveAPI Path] Reached effective root folder.');
          // Optional: Add the root folder itself if needed, depending on requirements
          // const rootResponse = await drive.files.get({ fileId: effectiveRootId, fields: 'id, name'});
          // if (rootResponse.data.id && rootResponse.data.name) {
          //   pathSegments.unshift({ id: rootResponse.data.id, name: rootResponse.data.name });
          // }
          break;
        }
      } else {
        // No parents found, implies this might be the root or an orphaned folder
        console.log(`[DriveAPI Path] No parents found for folder: ${currentFolderId}. Stopping path generation.`);
        currentFolderId = null; // Stop the loop
      }
    } // end while

    console.log(`[DriveAPI Path] Generated path for ${folderId}:`, pathSegments.map(p => p.name).join(' / '));
    return pathSegments;

  } catch (error: any) {
    console.error(`[DriveAPI Path Error] Failed to fetch folder path for ID "${folderId}":`, error.message || error);
    throw new Error(`Failed to retrieve folder path from Google Drive. ${error.message}`);
  }
}
