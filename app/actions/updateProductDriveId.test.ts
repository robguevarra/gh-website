/**
 * Tests for the Google Drive ID extraction functionality
 * 
 * This file contains unit tests for the extractGoogleDriveId and isValidGoogleDriveId
 * functions to ensure they correctly handle various input formats.
 */

import { extractGoogleDriveId, isValidGoogleDriveId } from './updateProductDriveId';

// Add Jest type definitions
declare global {
  var describe: (name: string, fn: () => void) => void;
  var test: (name: string, fn: () => void) => void;
  var expect: any;
}

describe('extractGoogleDriveId', () => {
  test('should return empty string for empty input', () => {
    expect(extractGoogleDriveId('')).toBe('');
    expect(extractGoogleDriveId(null as any)).toBe('');
    expect(extractGoogleDriveId(undefined as any)).toBe('');
  });

  test('should return the ID directly if already in ID format', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz12345';
    expect(extractGoogleDriveId(id)).toBe(id);
  });

  test('should extract ID from folder URL', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz12345';
    const url = `https://drive.google.com/drive/folders/${id}`;
    expect(extractGoogleDriveId(url)).toBe(id);
  });

  test('should extract ID from file URL', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz12345';
    const url = `https://drive.google.com/file/d/${id}/view`;
    expect(extractGoogleDriveId(url)).toBe(id);
  });

  test('should extract ID from user-specific folder URL', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz12345';
    const url = `https://drive.google.com/drive/u/0/folders/${id}`;
    expect(extractGoogleDriveId(url)).toBe(id);
  });

  test('should extract ID from shared URL with id parameter', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz12345';
    const url = `https://drive.google.com/open?id=${id}`;
    expect(extractGoogleDriveId(url)).toBe(id);
  });

  test('should handle malformed URLs gracefully', () => {
    const id = '1AbCdEfGhIjKlMnOpQrStUvWxYz12345';
    const badUrl = `drive.google.com/drive/folders/${id}`; // Missing protocol
    expect(extractGoogleDriveId(badUrl)).toBe(id);
  });
});

describe('isValidGoogleDriveId', () => {
  test('should return true for valid Google Drive IDs', () => {
    expect(isValidGoogleDriveId('1AbCdEfGhIjKlMnOpQrStUvWxYz12345')).toBe(true);
    expect(isValidGoogleDriveId('a-zA-Z0-9_-a-zA-Z0-9_-a-zA-Z0-9_-')).toBe(true);
  });

  test('should return false for invalid Google Drive IDs', () => {
    expect(isValidGoogleDriveId('')).toBe(false);
    expect(isValidGoogleDriveId('too-short')).toBe(false);
    expect(isValidGoogleDriveId('contains/invalid/characters')).toBe(false);
    expect(isValidGoogleDriveId('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOpQrStUvWxYz12345')).toBe(false);
  });
});
