/**
 * Formats a numeric value as Philippine Peso (PHP) currency.
 *
 * @param value - The numeric value to format.
 * @returns The formatted currency string (e.g., "₱1,234.56") or an empty string if the value is invalid.
 */
export const formatCurrencyPHP = (value: number | null | undefined): string => {
  // Check if the value is a valid number
  if (typeof value !== 'number' || isNaN(value)) {
    // Return an empty string or a default value like '₱0.00' if preferred
    // console.warn('Invalid value provided to formatCurrencyPHP:', value); // Optional warning
    return ''; // Or return '₱0.00'
  }

  // Use Intl.NumberFormat for locale-aware currency formatting
  try {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(value);
  } catch (error) {
    console.error('Error formatting currency:', error);
    // Fallback or return an indicator of error
    return `₱${value.toFixed(2)} (Error)`; // Simple fallback
  }
};

// Optional: Function to handle both sale and regular price display logic
interface PriceDisplayOptions {
  price: number | null | undefined;
  compareAtPrice?: number | null | undefined;
}

/**
 * Generates formatted price display, handling regular and sale prices with PHP formatting.
 * Includes strike-through for compare-at price when applicable.
 *
 * @param options - An object containing price and optional compareAtPrice.
 * @returns An object with formattedPrice and optional formattedCompareAtPrice strings.
 */
export const formatPriceDisplayPHP = (options: PriceDisplayOptions): { formattedPrice: string; formattedCompareAtPrice?: string } => {
  const { price, compareAtPrice } = options;

  const formattedPrice = formatCurrencyPHP(price);

  let formattedCompareAtPrice: string | undefined = undefined;

  // Check if compareAtPrice is valid and higher than the price
  if (typeof compareAtPrice === 'number' && !isNaN(compareAtPrice) && compareAtPrice > (price ?? 0)) {
    formattedCompareAtPrice = formatCurrencyPHP(compareAtPrice);
  }

  return { formattedPrice, formattedCompareAtPrice };
}; 