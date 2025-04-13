# Google Drive Integration Phase 3: Vercel Deployment

## Overview
This build note documents the changes made to the Google Drive integration to make it compatible with Vercel deployment. The main change is switching from using a file-based service account key to using an environment variable to store the service account credentials.

## Background
Previously, the Google Drive integration was using a file-based service account key (`GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./GH Project New.json`). This approach works well for local development but is not suitable for Vercel deployment because:

1. Vercel doesn't support file-based secrets
2. The service account key file would need to be committed to the repository, which is a security risk
3. Vercel recommends using environment variables for secrets

## Changes Made

### 1. Updated Environment Variables
- Added `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON` environment variable containing the JSON content of the service account key
- Commented out the `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` variable for local development reference

### 2. Verified Authentication Logic
- Confirmed that the `getGoogleAuthClient` function in `lib/google-drive/driveApiUtils.ts` already supports both approaches:
  - It first checks for `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON` (for production)
  - If not found, it falls back to `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` (for development)

### 3. Deployment Considerations
- When deploying to Vercel, the `GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON` environment variable should be set in the Vercel project settings
- The JSON content needs to be properly escaped for the environment variable

## Implementation Details

### Authentication Logic
The existing authentication logic in `lib/google-drive/driveApiUtils.ts` already handles both approaches:

```typescript
async function getGoogleAuthClient() {
  const credentialsJson = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS_JSON;
  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  let authOptions: any = {
    scopes: SCOPES,
  };

  if (credentialsJson) {
    try {
      const credentials = JSON.parse(credentialsJson);
      authOptions.credentials = credentials;
    } catch (error) {
      throw new Error('Invalid service account credentials JSON provided in environment variable.');
    }
  } else if (keyFilePath) {
    try {
      const absoluteKeyFilePath = path.resolve(process.cwd(), keyFilePath);
      authOptions.keyFile = absoluteKeyFilePath;
    } catch (error) {
      throw new Error('Invalid service account key file path provided.');
    }
  } else {
    throw new Error('Google Drive API credentials are not configured.');
  }

  try {
    const auth = new google.auth.GoogleAuth(authOptions);
    return auth;
  } catch (error) {
    throw new Error('Failed to initialize Google Drive authentication.');
  }
}
```

## Testing
- The changes have been tested locally to ensure that the Google Drive integration still works with the new environment variable approach
- The Google Drive viewer component has been tested to ensure it can still access and display files from Google Drive
- Added detailed logging to help diagnose authentication issues
- Fixed an issue with the preview button not working by enabling both authentication methods during development

### Debugging Steps
1. Added logging to the Google Drive API route to track request parameters
2. Enhanced the `getGoogleAuthClient` function with detailed logging
3. Added validation for the credentials JSON to ensure it contains required fields
4. Added file existence check for the key file path
5. Added authentication testing by getting a client during initialization

## Fixing Preview Button Issues

After implementing the environment variable changes, we encountered an issue with the template preview button not working. We identified that the preview modal was not being properly rendered in the template browser component. We implemented the following fixes:

1. **Enabled Both Authentication Methods During Development**:
   - Uncommented the `GOOGLE_SERVICE_ACCOUNT_KEY_PATH` in the `.env` file
   - This allows the application to fall back to the file-based approach if the JSON credentials fail

2. **Added Detailed Logging**:
   - Added logging to the `getGoogleAuthClient` function to track authentication flow
   - Added logging to the template browser component to track preview button clicks
   - Added logging to the template preview modal to track iframe loading

3. **Enhanced Error Handling**:
   - Added file existence check for the key file path
   - Added validation for the credentials JSON to ensure it contains required fields
   - Added authentication testing by getting a client during initialization

4. **Fixed Template Preview Modal**:
   - Added local state for preview file and modal visibility in the template browser component
   - Added a custom preview handler to manage the modal state
   - Added the TemplatePreviewModal component directly to the template browser
   - Connected the preview button click handler to the modal state

## Next Steps
- Deploy the application to Vercel with the new environment variable configuration
- Verify that the Google Drive integration works correctly in the Vercel environment
- Consider adding additional error handling and logging to help diagnose any issues that may arise in production
- After successful deployment, clean up the debugging code
