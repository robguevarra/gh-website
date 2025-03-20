export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          first_name: string | null
          last_name: string | null
          phone: string | null
          avatar_url: string | null
          role: string
          preferences: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: string
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          first_name?: string | null
          last_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          role?: string
          preferences?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      membership_tiers: {
        Row: {
          id: string
          name: string
          description: string | null
          price_monthly: number
          price_yearly: number
          features: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_monthly: number
          price_yearly: number
          features?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_monthly?: number
          price_yearly?: number
          features?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      user_memberships: {
        Row: {
          id: string
          user_id: string
          tier_id: string
          status: string
          started_at: string
          expires_at: string | null
          payment_reference: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier_id: string
          status?: string
          started_at?: string
          expires_at?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier_id?: string
          status?: string
          started_at?: string
          expires_at?: string | null
          payment_reference?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          id: string
          title: string
          slug: string
          description: string | null
          thumbnail_url: string | null
          trailer_url: string | null
          status: string
          is_featured: boolean
          required_tier_id: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          slug: string
          description?: string | null
          thumbnail_url?: string | null
          trailer_url?: string | null
          status?: string
          is_featured?: boolean
          required_tier_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          slug?: string
          description?: string | null
          thumbnail_url?: string | null
          trailer_url?: string | null
          status?: string
          is_featured?: boolean
          required_tier_id?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      modules: {
        Row: {
          id: string
          course_id: string
          title: string
          description: string | null
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          course_id: string
          title: string
          description?: string | null
          position: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          course_id?: string
          title?: string
          description?: string | null
          position?: number
          created_at?: string
          updated_at?: string
        }
      }
      lessons: {
        Row: {
          id: string
          module_id: string
          title: string
          description: string | null
          video_url: string | null
          duration: number | null
          position: number
          is_preview: boolean
          content: string | null
          attachments: Json | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          module_id: string
          title: string
          description?: string | null
          video_url?: string | null
          duration?: number | null
          position: number
          is_preview?: boolean
          content?: string | null
          attachments?: Json | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          module_id?: string
          title?: string
          description?: string | null
          video_url?: string | null
          duration?: number | null
          position?: number
          is_preview?: boolean
          content?: string | null
          attachments?: Json | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      tags: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      course_tags: {
        Row: {
          course_id: string
          tag_id: string
          created_at: string
        }
        Insert: {
          course_id: string
          tag_id: string
          created_at?: string
        }
        Update: {
          course_id?: string
          tag_id?: string
          created_at?: string
        }
      }
      user_progress: {
        Row: {
          id: string
          user_id: string
          lesson_id: string
          status: string
          progress_percentage: number
          last_position: number
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          lesson_id: string
          status?: string
          progress_percentage?: number
          last_position?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          lesson_id?: string
          status?: string
          progress_percentage?: number
          last_position?: number
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_enrollments: {
        Row: {
          id: string
          user_id: string
          course_id: string
          enrolled_at: string
          expires_at: string | null
          status: string
          payment_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          course_id: string
          enrolled_at?: string
          expires_at?: string | null
          status?: string
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          course_id?: string
          enrolled_at?: string
          expires_at?: string | null
          status?: string
          payment_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          user_id: string
          amount: number
          currency: string
          status: string
          payment_method: string | null
          provider_reference: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          currency?: string
          status?: string
          payment_method?: string | null
          provider_reference?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          currency?: string
          status?: string
          payment_method?: string | null
          provider_reference?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      invoices: {
        Row: {
          id: string
          user_id: string
          transaction_id: string | null
          invoice_number: string
          due_date: string
          paid_date: string | null
          amount: number
          items: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          transaction_id?: string | null
          invoice_number: string
          due_date: string
          paid_date?: string | null
          amount: number
          items: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          transaction_id?: string | null
          invoice_number?: string
          due_date?: string
          paid_date?: string | null
          amount?: number
          items?: Json
          created_at?: string
          updated_at?: string
        }
      }
      subscription_payments: {
        Row: {
          id: string
          user_id: string
          membership_id: string
          transaction_id: string | null
          billing_period_start: string
          billing_period_end: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          membership_id: string
          transaction_id?: string | null
          billing_period_start: string
          billing_period_end: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          membership_id?: string
          transaction_id?: string | null
          billing_period_start?: string
          billing_period_end?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      payment_methods: {
        Row: {
          id: string
          user_id: string
          type: string
          provider_token: string | null
          last_four: string | null
          expiry_date: string | null
          is_default: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          provider_token?: string | null
          last_four?: string | null
          expiry_date?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          provider_token?: string | null
          last_four?: string | null
          expiry_date?: string | null
          is_default?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      discount_codes: {
        Row: {
          id: string
          code: string
          discount_type: string
          amount: number
          start_date: string | null
          end_date: string | null
          usage_limit: number | null
          usage_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          discount_type: string
          amount: number
          start_date?: string | null
          end_date?: string | null
          usage_limit?: number | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          discount_type?: string
          amount?: number
          start_date?: string | null
          end_date?: string | null
          usage_limit?: number | null
          usage_count?: number
          created_at?: string
          updated_at?: string
        }
      }
      email_templates: {
        Row: {
          id: string
          name: string
          description: string | null
          subject: string
          html_content: string
          text_content: string
          variables: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          subject: string
          html_content: string
          text_content: string
          variables?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          subject?: string
          html_content?: string
          text_content?: string
          variables?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      email_campaigns: {
        Row: {
          id: string
          name: string
          description: string | null
          status: string
          scheduled_at: string | null
          completed_at: string | null
          template_id: string
          sender_email: string
          sender_name: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: string
          scheduled_at?: string | null
          completed_at?: string | null
          template_id: string
          sender_email: string
          sender_name: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: string
          scheduled_at?: string | null
          completed_at?: string | null
          template_id?: string
          sender_email?: string
          sender_name?: string
          created_at?: string
          updated_at?: string
        }
      }
      campaign_recipients: {
        Row: {
          id: string
          campaign_id: string
          user_id: string
          sent_at: string | null
          opened_at: string | null
          clicked_at: string | null
          unsubscribed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          campaign_id: string
          user_id: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          campaign_id?: string
          user_id?: string
          sent_at?: string | null
          opened_at?: string | null
          clicked_at?: string | null
          unsubscribed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      email_automations: {
        Row: {
          id: string
          name: string
          trigger_type: string
          trigger_condition: Json | null
          status: string
          template_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          trigger_type: string
          trigger_condition?: Json | null
          status?: string
          template_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          trigger_type?: string
          trigger_condition?: Json | null
          status?: string
          template_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      user_email_preferences: {
        Row: {
          id: string
          user_id: string
          marketing_emails: boolean
          transactional_emails: boolean
          newsletter: boolean
          course_updates: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          marketing_emails?: boolean
          transactional_emails?: boolean
          newsletter?: boolean
          course_updates?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          marketing_emails?: boolean
          transactional_emails?: boolean
          newsletter?: boolean
          course_updates?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          permissions: Json | null
          priority: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          permissions?: Json | null
          priority: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          permissions?: Json | null
          priority?: number
          created_at?: string
          updated_at?: string
        }
      }
      permissions: {
        Row: {
          id: string
          name: string
          description: string | null
          resource_type: string
          action_type: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          resource_type: string
          action_type: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          resource_type?: string
          action_type?: string
          created_at?: string
          updated_at?: string
        }
      }
      role_permissions: {
        Row: {
          role_id: string
          permission_id: string
          created_at: string
        }
        Insert: {
          role_id: string
          permission_id: string
          created_at?: string
        }
        Update: {
          role_id?: string
          permission_id?: string
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          user_id: string
          role_id: string
          created_at: string
        }
        Insert: {
          user_id: string
          role_id: string
          created_at?: string
        }
        Update: {
          user_id?: string
          role_id?: string
          created_at?: string
        }
      }
      access_grants: {
        Row: {
          id: string
          user_id: string
          resource_type: string
          resource_id: string
          granted_by: string | null
          expires_at: string | null
          capabilities: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_type: string
          resource_id: string
          granted_by?: string | null
          expires_at?: string | null
          capabilities?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_type?: string
          resource_id?: string
          granted_by?: string | null
          expires_at?: string | null
          capabilities?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      execute_sql: {
        Args: {
          sql: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
} 