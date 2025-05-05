// Admin-related TypeScript interfaces for the admin user management system

import { Database } from './supabase';

// Define the admin-related tables directly without extending Database
export type AdminTables = {
  public: {
    Tables: Database['public']['Tables'] & {
      // Admin Audit Log table
      admin_audit_log: {
        Row: {
          id: string;
          admin_id: string;
          user_id: string | null;
          action_type: string;
          entity_type: string;
          entity_id: string | null;
          previous_state: any | null;
          new_state: any | null;
          ip_address: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          admin_id: string;
          user_id?: string | null;
          action_type: string;
          entity_type: string;
          entity_id?: string | null;
          previous_state?: any | null;
          new_state?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          admin_id?: string;
          user_id?: string | null;
          action_type?: string;
          entity_type?: string;
          entity_id?: string | null;
          previous_state?: any | null;
          new_state?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      
      // User Notes table
      user_notes: {
        Row: {
          id: string;
          user_id: string;
          admin_id: string;
          note_text: string;
          note_type: string;
          is_pinned: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          admin_id: string;
          note_text: string;
          note_type?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          admin_id?: string;
          note_text?: string;
          note_type?: string;
          is_pinned?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
      
      // User Activity Log table
      user_activity_log: {
        Row: {
          id: string;
          user_id: string;
          activity_type: string;
          resource_type: string | null;
          resource_id: string | null;
          metadata: any | null;
          ip_address: string | null;
          user_agent: string | null;
          session_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          activity_type: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          activity_type?: string;
          resource_type?: string | null;
          resource_id?: string | null;
          metadata?: any | null;
          ip_address?: string | null;
          user_agent?: string | null;
          session_id?: string | null;
          created_at?: string;
        };
        Relationships: Array<{
          foreignKeyName: string;
          columns: string[];
          isOneToOne: boolean;
          referencedRelation: string;
          referencedColumns: string[];
        }>;
      };
    };
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'];
    Enums: Database['public']['Enums'];
  };
};

// Extended unified_profiles type with admin fields
export interface ExtendedUnifiedProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  acquisition_source: string | null;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  status: string;
  admin_metadata: any | null;
  last_login_at: string | null;
  login_count: number;
  transaction_count?: number;
  enrollment_count?: number;
  total_spent?: number;
}

// User search parameters
export interface UserSearchParams {
  searchTerm?: string;
  status?: string;
  tags?: string[];
  acquisitionSource?: string;
  createdAfter?: string;
  createdBefore?: string;
  hasTransactions?: boolean;
  hasEnrollments?: boolean;
  limit?: number;
  offset?: number;
  sortField?: string; // Field to sort by (name, status, source, activity, joined)
  sortDirection?: 'asc' | 'desc'; // Sort direction
}

// Audit log entry
export interface AuditLogEntry extends Omit<AdminTables['public']['Tables']['admin_audit_log']['Row'], 'Relationships'> {
  admin?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

// User note with admin info
export interface UserNote extends Omit<AdminTables['public']['Tables']['user_notes']['Row'], 'Relationships'> {
  admin?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

// User activity log entry
export interface UserActivityLogEntry extends Omit<AdminTables['public']['Tables']['user_activity_log']['Row'], 'Relationships'> {
  // Add any additional fields needed for the admin interface
}

// User purchase history item
export interface UserPurchaseHistoryItem {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  record_type: 'transaction' | 'shopify_order';
  record_id: string;
  amount: number;
  currency: string;
  status: string;
  product_type: string;
  purchase_date: string;
  payment_method: string | null;
  reference: string | null;
  product_details: any | null;
}

// User detail with related data
export interface UserDetail extends ExtendedUnifiedProfile {
  notes?: UserNote[];
  activities?: UserActivityLogEntry[];
  purchases?: UserPurchaseHistoryItem[];
  enrollments?: any[]; // Use the appropriate type from your database
}
