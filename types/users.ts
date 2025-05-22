// types/users.ts

// Represents a consolidated user profile, potentially from multiple sources.
export interface UnifiedProfile {
  id: string;          // Typically the Supabase Auth user ID (UUID)
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  tags?: string[] | null;       // Array of tag names or IDs associated with the user
  email_bounced?: boolean | null; // Flag indicating if emails to this address have bounced
  // Add other common user fields as needed, e.g.:
  // created_at?: string;
  // last_login_at?: string;
  // avatar_url?: string;
  // phone_number?: string;
  // custom_fields?: Record<string, any>;
}

// You can add other user-related types here, for example:
// export interface UserPreferences {
//   user_id: string;
//   receive_newsletter?: boolean;
//   theme?: 'light' | 'dark';
// } 