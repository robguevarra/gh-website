import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a number as a currency string (e.g., PHP 1,234.56).
 * Assumes PHP currency for now, can be made more dynamic if needed.
 * @param amount - The numeric amount to format.
 * @param currency - The currency code (defaults to 'PHP').
 * @returns The formatted currency string.
 */
export function formatPrice(amount: number, currency: string = 'PHP'): string {
  // Use Intl.NumberFormat for robust localization and currency formatting
  const formatter = new Intl.NumberFormat('en-US', { // Use 'en-PH' or appropriate locale if needed
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Intl formats with symbol by default (e.g., $1,234.56 or ₱1,234.56)
  // If you specifically want "PHP 1,234.56", we might need manual formatting
  // Let's stick with Intl standard for now.
  return formatter.format(amount);
}
