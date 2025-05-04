// Admin-related TypeScript interfaces for the admin user management system

import { Database } from './supabase';

// Extend the Database type to include our new admin-related tables
export interface AdminDatabase extends Database {
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
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "unified_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "admin_audit_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "unified_profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "user_notes_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "unified_profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_notes_admin_id_fkey";
            columns: ["admin_id"];
            isOneToOne: false;
            referencedRelation: "unified_profiles";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "unified_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Database['public']['Views'];
    Functions: Database['public']['Functions'];
    Enums: Database['public']['Enums'];
  };
};

// Extended unified_profiles type with admin fields
export interface ExtendedUnifiedProfile extends Database['public']['Tables']['unified_profiles']['Row'] {
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
}

// Audit log entry
export interface AuditLogEntry extends AdminDatabase['public']['Tables']['admin_audit_log']['Row'] {
  admin?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

// User note with admin info
export interface UserNote extends AdminDatabase['public']['Tables']['user_notes']['Row'] {
  admin?: {
    email: string;
    first_name: string | null;
    last_name: string | null;
  };
}

// User activity log entry
export interface UserActivityLogEntry extends AdminDatabase['public']['Tables']['user_activity_log']['Row'] {
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
