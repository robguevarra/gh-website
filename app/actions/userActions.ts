'use client';

import { getOwnedProductIdsServer } from './serverActions';

/**
 * Client-side wrapper around the server action to fetch owned product IDs.
 * This function can be safely called from client components.
 * @returns {Promise<string[]>} A promise that resolves to a unique array of owned product IDs.
 */
export async function getOwnedProductIds(): Promise<string[]> {
  try {
    return await getOwnedProductIdsServer();
  } catch (error) {
    console.error('[getOwnedProductIds] Error fetching owned products:', error);
    return [];
  }
} 