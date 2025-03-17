/**
 * Accessibility utilities for ensuring WCAG compliance
 */

/**
 * Converts a hex color to RGB values
 * @param hex - Hex color code (e.g., "#ffffff" or "#fff")
 * @returns RGB values as an object {r, g, b}
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  // Remove # if present
  hex = hex.replace(/^#/, '');

  // Handle shorthand hex (e.g., #fff)
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }

  // Parse the hex values
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Calculates the relative luminance of a color
 * Based on WCAG 2.0 formula: https://www.w3.org/TR/WCAG20-TECHS/G17.html
 * 
 * @param color - RGB color values
 * @returns Relative luminance value
 */
export function getLuminance(color: { r: number; g: number; b: number }): number {
  // Convert RGB to sRGB
  const sRGB = {
    r: color.r / 255,
    g: color.g / 255,
    b: color.b / 255,
  };

  // Calculate RGB values
  const rgb = {
    r: sRGB.r <= 0.03928 ? sRGB.r / 12.92 : Math.pow((sRGB.r + 0.055) / 1.055, 2.4),
    g: sRGB.g <= 0.03928 ? sRGB.g / 12.92 : Math.pow((sRGB.g + 0.055) / 1.055, 2.4),
    b: sRGB.b <= 0.03928 ? sRGB.b / 12.92 : Math.pow((sRGB.b + 0.055) / 1.055, 2.4),
  };

  // Calculate luminance
  return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
}

/**
 * Calculates the contrast ratio between two colors
 * Based on WCAG 2.0 formula: https://www.w3.org/TR/WCAG20-TECHS/G17.html
 * 
 * @param color1 - First color in hex format
 * @param color2 - Second color in hex format
 * @returns Contrast ratio (1-21)
 */
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid color format. Use hex format (e.g., "#ffffff")');
  }

  const luminance1 = getLuminance(rgb1);
  const luminance2 = getLuminance(rgb2);

  // Calculate contrast ratio
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if the contrast ratio meets WCAG 2.1 AA standards
 * 
 * @param contrastRatio - The contrast ratio to check
 * @param isLargeText - Whether the text is large (>=18pt or >=14pt bold)
 * @returns Object with AA compliance status
 */
export function meetsWCAGAA(contrastRatio: number, isLargeText: boolean = false): { 
  passes: boolean; 
  minimumRatio: number;
  actualRatio: number;
} {
  const minimumRatio = isLargeText ? 3 : 4.5;
  
  return {
    passes: contrastRatio >= minimumRatio,
    minimumRatio,
    actualRatio: contrastRatio,
  };
}

/**
 * Checks if the contrast ratio meets WCAG 2.1 AAA standards
 * 
 * @param contrastRatio - The contrast ratio to check
 * @param isLargeText - Whether the text is large (>=18pt or >=14pt bold)
 * @returns Object with AAA compliance status
 */
export function meetsWCAGAAA(contrastRatio: number, isLargeText: boolean = false): { 
  passes: boolean; 
  minimumRatio: number;
  actualRatio: number;
} {
  const minimumRatio = isLargeText ? 4.5 : 7;
  
  return {
    passes: contrastRatio >= minimumRatio,
    minimumRatio,
    actualRatio: contrastRatio,
  };
} 