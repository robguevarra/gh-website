import { google, drive_v3 } from 'googleapis';
import path from 'path';

// Define the structure for items returned by our utility functions
export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null; // Ensure consistency, Drive API might return null
  isFolder: boolean;
  size?: string | null;         // Optional: File size (usually string) - not present for folders
  description?: string | null;  // Optional: User-provided description
  createdTime?: string | null;  // Optional: Creation timestamp
  // Add other relevant fields if needed (e.g., webViewLink, thumbnailLink)
}

// Define the structure for breadcrumb segments
export interface BreadcrumbSegment {
  id: string;
  name: string;
}

// --- Authentication Logic ---

// Updated scope to allow modifying permissions (e.g., granting access via drive.permissions.create)
// Previous: 'https://www.googleapis.com/auth/drive.readonly'
const SCOPES = ['https://www.googleapis.com/auth/drive'];

/**
 * Creates and returns an authenticated Google Auth client.
 * It prioritizes credentials from the GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON env var (for production)
 * and falls back to the GOOGLE_SERVICE_ACCOUNT_KEY_PATH env var (for development).
 * @throws {Error} If neither credential source is found or if credentials are invalid.
 */
async function getGoogleAuthClient() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON;
  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  console.log('Google Auth Client initialization:', {
    hasCredentialsJson: !!credentialsJson,
    hasKeyFilePath: !!keyFilePath,
    keyFilePath: keyFilePath || 'not set'
  });

  let authOptions: any = { // Using 'any' temporarily as options differ slightly
    scopes: SCOPES,
  };

  if (credentialsJson) {
    try {
      console.log('Using credentials from GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON');
      const credentials = JSON.parse(credentialsJson);
      // Verify the credentials have the required fields
      if (!credentials.client_email || !credentials.private_key) {
        throw new Error('Credentials JSON is missing required fields (client_email or private_key)');
      }
      authOptions.credentials = credentials;
    } catch (error: any) {
      console.error('Error parsing credentials JSON:', error.message);
      throw new Error('Invalid service account credentials JSON provided in environment variable.');
    }
  } else if (keyFilePath) {
    try {
      console.log('Using key file from GOOGLE_SERVICE_ACCOUNT_KEY_PATH');
      const absoluteKeyFilePath = path.resolve(process.cwd(), keyFilePath);
      // Add a check to see if the file actually exists
      const fs = require('fs');
      if (!fs.existsSync(absoluteKeyFilePath)) {
        console.error(`Service account key file not found at path: ${absoluteKeyFilePath}`);
        throw new Error(`Service account key file not found at path: ${absoluteKeyFilePath}`);
      }
      authOptions.keyFile = absoluteKeyFilePath;
    } catch (error: any) {
      console.error('Error with key file path:', error.message);
      throw new Error('Invalid service account key file path provided.');
    }
  } else {
    console.error('No Google Drive API credentials configured');
    throw new Error('Google Drive API credentials are not configured.');
  }

  try {
    console.log('Creating GoogleAuth client with options:', {
      hasCredentials: !!authOptions.credentials,
      hasKeyFile: !!authOptions.keyFile,
      scopes: authOptions.scopes
    });

    const auth = new google.auth.GoogleAuth(authOptions);

    // Test the authentication by getting a client
    try {
      console.log('Testing authentication by getting a client...');
      const client = await auth.getClient();
      console.log('Authentication successful');
    } catch (clientError: any) {
      console.error('Error getting auth client:', clientError.message);
      throw clientError;
    }

    return auth;
  } catch (error: any) {
    console.error('Failed to initialize Google Drive authentication:', error.message);
    throw new Error(`Failed to initialize Google Drive authentication: ${error.message}`);
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
  try {
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    let targetFolderId = folderId;
    if (!targetFolderId) {
      targetFolderId = process.env[ROOT_FOLDER_ID_ENV_VAR];
      if (!targetFolderId) {
        targetFolderId = 'root'; // Use the 'root' alias as a fallback
      } else {
      }
    }

    const response = await drive.files.list({
      q: `'${targetFolderId}' in parents and trashed=false`,
      // Add size, description, createdTime to the requested fields
      fields: 'files(id, name, mimeType, modifiedTime, size, description, createdTime)',
      orderBy: 'folder,name', // Sort by type (folders first), then by name
      pageSize: 1000, // Adjust page size as needed
    });

    const files = response.data.files;
    if (!files || files.length === 0) {
      return [];
    }

    const driveItems: DriveItem[] = files.map((file): DriveItem => ({
      id: file.id!, // Non-null assertion, assuming API always returns id
      name: file.name!, // Non-null assertion
      mimeType: file.mimeType!, // Non-null assertion
      modifiedTime: typeof file.modifiedTime === 'undefined' ? null : file.modifiedTime,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      size: typeof file.size === 'undefined' ? null : file.size, // Explicit undefined check
      description: typeof file.description === 'undefined' ? null : file.description, // Explicit undefined check
      createdTime: typeof file.createdTime === 'undefined' ? null : file.createdTime, // Explicit undefined check
    }));

    // Already sorted by API using orderBy: 'folder,name'
    return driveItems;

  } catch (error: any) {
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
    return []; // Return empty path for null/empty input ID
  }

  try {
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    // Determine the effective root ID to stop the recursion
    const effectiveRootId = rootFolderId || process.env[ROOT_FOLDER_ID_ENV_VAR] || 'root';

    const pathSegments: BreadcrumbSegment[] = [];
    let currentFolderId: string | null | undefined = folderId;

    // Limit loop iterations to prevent infinite loops in case of cyclic paths (unlikely but safe)
    let iteration = 0;
    const maxIterations = 10; // Adjust as needed

    // Stop if we somehow reach the absolute Drive root or the configured root
    while (currentFolderId && currentFolderId !== effectiveRootId && iteration < maxIterations) {
      iteration++;
      try {
        // Fetch details for the current folder
        const response = await drive.files.get({
          fileId: currentFolderId,
          fields: 'id, name, parents', // Request ID, name, and parent IDs
        });

        // Add explicit type for the file data
        const file: drive_v3.Schema$File = response.data;
        if (!file || !file.id || !file.name) {
          // Decide if we should throw or return partial path
          // Returning partial path might be more user-friendly
          break; // Stop building the path if a folder is missing
        }

        // Add the current folder to the start of the path array
        pathSegments.unshift({ id: file.id, name: file.name }); // Correctly add to the beginning

        // Move to the parent folder
        if (file.parents && file.parents.length > 0) {
          // currentFolderId = file.parents[0]; // Assume single parent
          // Explicitly handle undefined case by assigning null
          currentFolderId = file.parents[0] ?? null;
           // Check if the parent is the effective root, if so, add root and stop
          if (currentFolderId === effectiveRootId) {
            // Optional: Add the root folder itself if needed, depending on requirements
            // const rootResponse = await drive.files.get({ fileId: effectiveRootId, fields: 'id, name'});
            // if (rootResponse.data.id && rootResponse.data.name) {
            //   pathSegments.unshift({ id: rootResponse.data.id, name: rootResponse.data.name });
            // }
            break;
          }
        } else {
          // No parents found, implies this might be the root or an orphaned folder
          currentFolderId = null; // Stop the loop
        }
      } catch (loopError: any) {
        // If getting a specific folder fails (e.g., permissions), stop and return the path found so far
        console.error(`Error fetching folder details for ID ${currentFolderId} during path construction: ${loopError.message}`);
        break;
      }
    } // end while

    if (iteration >= maxIterations) {
      console.warn(`[getFolderPath] Reached maximum iterations (${maxIterations}) for folder ID ${folderId}. Path might be incomplete.`);
    }

    return pathSegments;

  } catch (error: any) {
    throw new Error(`Failed to retrieve folder path from Google Drive. ${error.message}`);
  }
}

// --- File Metadata & Download Logic ---

/**
 * Fetches metadata for a specific file from Google Drive.
 *
 * @param fileId The ID of the file to fetch metadata for.
 * @returns A promise that resolves to an object containing the file's name and mimeType.
 * @throws {Error} If authentication fails, the file is not found, or the API call fails.
 */
export async function getFileMetadata(fileId: string): Promise<{ name: string; mimeType: string }> {
  if (!fileId) {
    throw new Error('File ID cannot be empty.');
  }
  try {
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType', // Request only necessary fields
    });

    const file = response.data;

    if (!file || !file.name || !file.mimeType) {
      throw new Error(`File metadata incomplete or file not found for ID: ${fileId}`);
    }

    return {
      name: file.name,
      mimeType: file.mimeType,
    };
  } catch (error: any) {
    // Add more specific error checking if needed (e.g., 404 Not Found)
    console.error(`Failed to retrieve file metadata from Google Drive for ID ${fileId}.`, error);
    throw new Error(`Failed to retrieve file metadata from Google Drive. ${error.message}`);
  }
}

/**
 * Fetches the content stream for a specific file from Google Drive.
 *
 * @param fileId The ID of the file to download.
 * @returns A promise that resolves to a readable stream of the file content.
 * @throws {Error} If authentication fails, the file is not found, or the API call fails.
 */
export async function getFileStream(fileId: string): Promise<NodeJS.ReadableStream> {
   if (!fileId) {
    throw new Error('File ID cannot be empty.');
  }
  try {
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    console.log(`[Drive] Attempting to get binary file stream for ID: ${fileId}`);
    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media', // Specify 'media' to download file content
      },
      { responseType: 'stream' } // Ensure the response type is a stream
    );

    console.log(`[Drive] Successfully obtained binary file stream for ID: ${fileId}`);
    // The data property will be a readable stream
    return response.data as NodeJS.ReadableStream;

  } catch (error: any) {
     // Add more specific error checking if needed (e.g., 404 Not Found)
     // Log the specific Google API error if available
    const googleError = error.response?.data || error.errors || error;
    console.error(`[Drive] Failed to download binary file content for ID ${fileId}.`, JSON.stringify(googleError, null, 2));
    throw new Error(`Failed to download file content from Google Drive. ${error.message}`);
  }
}

/**
 * Exports a Google Workspace file (Docs, Sheets, Slides) to a specified format.
 *
 * @param fileId The ID of the Google Workspace file to export.
 * @param exportMimeType The target MIME type for the export (e.g., 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document').
 * @returns A promise that resolves to a readable stream of the exported file content.
 * @throws {Error} If authentication fails, the file is not found, export fails, or the MIME type is unsupported for the file.
 */
export async function exportFileStream(
  fileId: string,
  exportMimeType: string
): Promise<NodeJS.ReadableStream> {
  if (!fileId) {
    throw new Error('File ID cannot be empty for export.');
  }
  if (!exportMimeType) {
    throw new Error('Export MIME type cannot be empty.');
  }

  try {
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    console.log(`[Drive] Attempting to export file ID ${fileId} to MIME type ${exportMimeType}`);
    const response = await drive.files.export(
      {
        fileId: fileId,
        mimeType: exportMimeType,
      },
      { responseType: 'stream' } // Ensure the response type is a stream
    );

    console.log(`[Drive] Successfully obtained exported file stream for ID ${fileId} as ${exportMimeType}`);
    // The data property will be a readable stream
    return response.data as NodeJS.ReadableStream;

  } catch (error: any) {
    // Log the specific Google API error if available
    const googleError = error.response?.data || error.errors || error;
    console.error(`[Drive] Failed to export file ID ${fileId} to ${exportMimeType}.`, JSON.stringify(googleError, null, 2));
    // Provide a more specific error message if possible
    let message = `Failed to export file from Google Drive. ${error.message}`;
    if (googleError?.error?.message) {
        message = `Failed to export file from Google Drive: ${googleError.error.message}`;
    }
    throw new Error(message);
  }
}

// --- Permission Granting Logic ---

/**
 * Grants permission for a specific user email to access a Google Drive file/folder.
 * Requires the service account to have appropriate permissions on the target file/folder or its parent.
 * Uses the 'drive' scope, which should have been set during client initialization.
 *
 * @param fileId The ID of the file or folder to grant permission to.
 * @param userEmail The email address of the user to grant permission.
 * @param role The role to grant ('reader' or 'writer'). Defaults to 'reader'.
 * @param sendNotificationEmail Whether to send a notification email to the user. Defaults to false.
 * @returns A promise that resolves when the permission is successfully created.
 * @throws {Error} If authentication fails, the API call fails, or input is invalid.
 */
export async function grantFilePermission(
  fileId: string,
  userEmail: string,
  role: 'reader' | 'writer' = 'reader',
  sendNotificationEmail: boolean = false // Default to false to avoid potential spam
): Promise<void> {
  // Basic input validation
  if (!fileId) {
    throw new Error('[grantFilePermission] File ID is required.');
  }
  if (!userEmail) {
    throw new Error('[grantFilePermission] User email is required.');
  }
  // Very basic email format check
  if (!/\S+@\S+\.\S+/.test(userEmail)) {
      throw new Error(`[grantFilePermission] Invalid user email format: ${userEmail}`);
  }

  console.log(`[Drive] Attempting to grant '${role}' permission for ${userEmail} on file/folder ${fileId}`);

  try {
    const auth = await getGoogleAuthClient();
    const drive = google.drive({ version: 'v3', auth });

    const permissionRequestBody: drive_v3.Schema$Permission = {
      role: role,
      type: 'user',
      emailAddress: userEmail,
    };

    const response = await drive.permissions.create({
      fileId: fileId,
      requestBody: permissionRequestBody,
      fields: 'id', // Request the ID of the created permission back
      sendNotificationEmail: sendNotificationEmail,
    });

    // Log success with the permission ID
    console.log(`[Drive] Successfully granted permission. Permission ID: ${response.data.id}`);

  } catch (error: any) {
    // Log specific details if available (e.g., error code, message)
    const errMsg = error.response?.data?.error?.message || error.message || 'Unknown error';
    const errCode = error.code || error.response?.data?.error?.code || 'N/A';
    console.error(`[Drive] Failed to grant permission for ${userEmail} on ${fileId}. Code: ${errCode}, Message: ${errMsg}`, error);

    // Re-throw a more informative error
    throw new Error(`Failed to grant Google Drive permission. Error: ${errMsg} (Code: ${errCode})`);
  }
}
