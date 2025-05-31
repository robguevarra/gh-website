/**
 * Email Template Types
 * 
 * Type definitions for the email template system with Unlayer integration.
 * These types are used across the API and frontend components.
 */

// Basic template info returned in template listings
export type EmailTemplate = {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  updatedAt: string;
  version?: number;
  tags?: string[];
};

// Detailed template info returned when editing a specific template
export type DetailedTemplate = EmailTemplate & {
  htmlTemplate: string;
  renderedHtml?: string;
  subject?: string;
  design?: any; // JSON object containing Unlayer design data
  previousVersions?: {
    version: number;
    htmlTemplate: string;
    design?: any; // JSON object containing Unlayer design data
    updatedAt: string;
    editedBy?: string;
  }[];
};

// Template variables for personalization
export type TemplateVariables = Record<string, string | number | boolean | null>;

// Template category definition
export type TemplateCategory = {
  name: string;
  label: string;
  subcategories: {
    name: string;
    label: string;
  }[];
};

// Metadata stored alongside templates
export type TemplateMetadata = {
  htmlTemplate: string;
  design?: any; // JSON object containing Unlayer design data
  category: string;
  subcategory?: string | null;
  version: number;
  previousVersions: {
    version: number;
    htmlTemplate: string;
    design?: any; // JSON object containing Unlayer design data
    updatedAt: string;
    editedBy?: string;
  }[];
  tags?: string[];
};
