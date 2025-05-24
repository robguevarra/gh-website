export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      access_grants: {
        Row: {
          capabilities: Json | null
          created_at: string | null
          expires_at: string | null
          granted_by: string | null
          id: string
          resource_id: string
          resource_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          capabilities?: Json | null
          created_at?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          resource_id: string
          resource_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          capabilities?: Json | null
          created_at?: string | null
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          resource_id?: string
          resource_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      Account: {
        Row: {
          access_token: string | null
          expires_at: number | null
          id: number
          id_token: string | null
          provider: string
          providerAccountId: string
          refresh_token: string | null
          scope: string | null
          session_state: string | null
          token_type: string | null
          type: string
          userId: number
        }
        Insert: {
          access_token?: string | null
          expires_at?: number | null
          id?: number
          id_token?: string | null
          provider: string
          providerAccountId: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type: string
          userId: number
        }
        Update: {
          access_token?: string | null
          expires_at?: number | null
          id?: number
          id_token?: string | null
          provider?: string
          providerAccountId?: string
          refresh_token?: string | null
          scope?: string | null
          session_state?: string | null
          token_type?: string | null
          type?: string
          userId?: number
        }
        Relationships: [
          {
            foreignKeyName: "Account_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_ads: {
        Row: {
          adset_id: string | null
          created_at: string
          creative_id: string | null
          creative_summary: string | null
          effective_status: string | null
          fb_ad_id: string
          id: string
          name: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          adset_id?: string | null
          created_at?: string
          creative_id?: string | null
          creative_summary?: string | null
          effective_status?: string | null
          fb_ad_id: string
          id?: string
          name?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          adset_id?: string | null
          created_at?: string
          creative_id?: string | null
          creative_summary?: string | null
          effective_status?: string | null
          fb_ad_id?: string
          id?: string
          name?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_ads_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "ad_adsets"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_adsets: {
        Row: {
          campaign_id: string | null
          created_at: string
          daily_budget: number | null
          effective_status: string | null
          fb_adset_id: string
          id: string
          lifetime_budget: number | null
          name: string | null
          start_time: string | null
          status: string | null
          stop_time: string | null
          targeting_summary: string | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          daily_budget?: number | null
          effective_status?: string | null
          fb_adset_id: string
          id?: string
          lifetime_budget?: number | null
          name?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          targeting_summary?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          daily_budget?: number | null
          effective_status?: string | null
          fb_adset_id?: string
          id?: string
          lifetime_budget?: number | null
          name?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          targeting_summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_adsets_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_attributions: {
        Row: {
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          conversion_event: string
          conversion_value: number | null
          created_at: string
          currency: string | null
          event_time: string
          fb_click_id: string | null
          id: string
          source_platform: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          conversion_event: string
          conversion_value?: number | null
          created_at?: string
          currency?: string | null
          event_time: string
          fb_click_id?: string | null
          id?: string
          source_platform?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          conversion_event?: string
          conversion_value?: number | null
          created_at?: string
          currency?: string | null
          event_time?: string
          fb_click_id?: string | null
          id?: string
          source_platform?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_attributions_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_attributions_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "ad_adsets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_attributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_attributions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_attributions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_campaigns: {
        Row: {
          created_at: string
          effective_status: string | null
          fb_campaign_id: string
          id: string
          name: string | null
          objective: string | null
          start_time: string | null
          status: string | null
          stop_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          effective_status?: string | null
          fb_campaign_id: string
          id?: string
          name?: string | null
          objective?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          effective_status?: string | null
          fb_campaign_id?: string
          id?: string
          name?: string | null
          objective?: string | null
          start_time?: string | null
          status?: string | null
          stop_time?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ad_spend: {
        Row: {
          ad_id: string | null
          adset_id: string | null
          campaign_id: string | null
          clicks: number | null
          created_at: string
          currency: string | null
          date: string
          id: string
          impressions: number | null
          spend: number
        }
        Insert: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          created_at?: string
          currency?: string | null
          date: string
          id?: string
          impressions?: number | null
          spend: number
        }
        Update: {
          ad_id?: string | null
          adset_id?: string | null
          campaign_id?: string | null
          clicks?: number | null
          created_at?: string
          currency?: string | null
          date?: string
          id?: string
          impressions?: number | null
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "ad_spend_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_ads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_spend_adset_id_fkey"
            columns: ["adset_id"]
            isOneToOne: false
            referencedRelation: "ad_adsets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_spend_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ad_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          new_state: Json | null
          previous_state: Json | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_analytics: {
        Row: {
          bounce_rate: number | null
          campaign_id: string
          click_rate: number | null
          created_at: string | null
          id: string
          last_calculated_at: string | null
          open_rate: number | null
          total_bounces: number | null
          total_clicks: number | null
          total_complaints: number | null
          total_delivered: number | null
          total_failed: number | null
          total_opens: number | null
          total_recipients: number | null
          total_sent: number | null
          total_spam_complaints: number | null
          total_unsubscribes: number | null
          updated_at: string | null
        }
        Insert: {
          bounce_rate?: number | null
          campaign_id: string
          click_rate?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          open_rate?: number | null
          total_bounces?: number | null
          total_clicks?: number | null
          total_complaints?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_opens?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          total_spam_complaints?: number | null
          total_unsubscribes?: number | null
          updated_at?: string | null
        }
        Update: {
          bounce_rate?: number | null
          campaign_id?: string
          click_rate?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          open_rate?: number | null
          total_bounces?: number | null
          total_clicks?: number | null
          total_complaints?: number | null
          total_delivered?: number | null
          total_failed?: number | null
          total_opens?: number | null
          total_recipients?: number | null
          total_sent?: number | null
          total_spam_complaints?: number | null
          total_unsubscribes?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_analytics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          clicked_at: string | null
          created_at: string | null
          id: string
          opened_at: string | null
          sent_at: string | null
          status: string
          unsubscribed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          clicked_at?: string | null
          created_at?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          clicked_at?: string | null
          created_at?: string | null
          id?: string
          opened_at?: string | null
          sent_at?: string | null
          status?: string
          unsubscribed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_segments: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          segment_id: string
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          segment_id: string
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          segment_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_segments_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_segments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_templates: {
        Row: {
          campaign_id: string
          created_at: string | null
          html_content: string
          id: string
          is_active: boolean | null
          subject: string
          template_id: string
          text_content: string
          updated_at: string | null
          version: number
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          subject: string
          template_id: string
          text_content: string
          updated_at?: string | null
          version?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          subject?: string
          template_id?: string
          text_content?: string
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_templates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      content_templates: {
        Row: {
          content: string
          created_at: string | null
          description: string | null
          id: string
          metadata: Json
          title: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          title: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          title?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      course_media: {
        Row: {
          course_id: string
          created_at: string | null
          media_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          media_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          media_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_media_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_media_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
        ]
      }
      course_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          last_accessed_at: string | null
          progress_percentage: number | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          progress_percentage?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_tags: {
        Row: {
          course_id: string
          created_at: string | null
          tag_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          tag_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_tags_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          metadata: Json | null
          published_version: number | null
          required_tier_id: string | null
          settings: Json
          slug: string
          status: string
          thumbnail_url: string | null
          title: string
          trailer_url: string | null
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          metadata?: Json | null
          published_version?: number | null
          required_tier_id?: string | null
          settings?: Json
          slug: string
          status?: string
          thumbnail_url?: string | null
          title: string
          trailer_url?: string | null
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          metadata?: Json | null
          published_version?: number | null
          required_tier_id?: string | null
          settings?: Json
          slug?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          trailer_url?: string | null
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_required_tier_id_fkey"
            columns: ["required_tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          amount: number
          code: string
          created_at: string | null
          discount_type: string
          end_date: string | null
          id: string
          start_date: string | null
          updated_at: string | null
          usage_count: number | null
          usage_limit: number | null
        }
        Insert: {
          amount: number
          code: string
          created_at?: string | null
          discount_type: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Update: {
          amount?: number
          code?: string
          created_at?: string | null
          discount_type?: string
          end_date?: string | null
          id?: string
          start_date?: string | null
          updated_at?: string | null
          usage_count?: number | null
          usage_limit?: number | null
        }
        Relationships: []
      }
      ebook_contacts: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          last_name: string | null
          metadata: Json | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          metadata?: Json | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ecommerce_order_items: {
        Row: {
          created_at: string
          currency: string
          id: string
          order_id: string
          price_at_purchase: number
          product_id: string
          product_snapshot: Json | null
          quantity: number
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          order_id: string
          price_at_purchase: number
          product_id: string
          product_snapshot?: Json | null
          quantity?: number
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          order_id?: string
          price_at_purchase?: number
          product_id?: string
          product_snapshot?: Json | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "ecommerce_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_orders: {
        Row: {
          created_at: string
          currency: string
          id: string
          order_status: string
          payment_method: string
          total_amount: number
          transaction_id: string | null
          unified_profile_id: string | null
          updated_at: string
          user_id: string
          xendit_payment_id: string | null
        }
        Insert: {
          created_at?: string
          currency: string
          id?: string
          order_status?: string
          payment_method?: string
          total_amount: number
          transaction_id?: string | null
          unified_profile_id?: string | null
          updated_at?: string
          user_id: string
          xendit_payment_id?: string | null
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          order_status?: string
          payment_method?: string
          total_amount?: number
          transaction_id?: string | null
          unified_profile_id?: string | null
          updated_at?: string
          user_id?: string
          xendit_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_orders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_orders_unified_profile_id_fkey"
            columns: ["unified_profile_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_alerts: {
        Row: {
          alert_type: string
          created_at: string | null
          data: Json | null
          id: string
          message: string
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          timestamp: string
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          data?: Json | null
          id?: string
          message: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          timestamp: string
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          data?: Json | null
          id?: string
          message?: string
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      email_automations: {
        Row: {
          created_at: string | null
          id: string
          name: string
          status: string
          template_id: string
          trigger_condition: Json | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          status?: string
          template_id: string
          trigger_condition?: Json | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          status?: string
          template_id?: string
          trigger_condition?: Json | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_automations_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_batches: {
        Row: {
          batch_size: number
          campaign_id: string
          completed_at: string | null
          created_at: string
          fail_count: number
          id: string
          processed_count: number
          started_at: string | null
          status: Database["public"]["Enums"]["batch_status"]
          success_count: number
          updated_at: string
        }
        Insert: {
          batch_size: number
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          fail_count?: number
          id?: string
          processed_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          success_count?: number
          updated_at?: string
        }
        Update: {
          batch_size?: number
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          fail_count?: number
          id?: string
          processed_count?: number
          started_at?: string | null
          status?: Database["public"]["Enums"]["batch_status"]
          success_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_batches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          ab_test_variant_count: number | null
          ab_test_winner_selected_at: string | null
          ab_test_winner_version: number | null
          campaign_design_json: Json | null
          campaign_html_body: string | null
          completed_at: string | null
          content_json: Json | null
          created_at: string | null
          description: string | null
          id: string
          is_ab_test: boolean | null
          name: string
          scheduled_at: string | null
          segment_ids: string[] | null
          segment_rules: Json | null
          selected_template_id: string | null
          sender_email: string
          sender_name: string
          status: string
          status_message: string | null
          subject: string | null
          template_id: string
          updated_at: string | null
        }
        Insert: {
          ab_test_variant_count?: number | null
          ab_test_winner_selected_at?: string | null
          ab_test_winner_version?: number | null
          campaign_design_json?: Json | null
          campaign_html_body?: string | null
          completed_at?: string | null
          content_json?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_ab_test?: boolean | null
          name: string
          scheduled_at?: string | null
          segment_ids?: string[] | null
          segment_rules?: Json | null
          selected_template_id?: string | null
          sender_email: string
          sender_name: string
          status?: string
          status_message?: string | null
          subject?: string | null
          template_id: string
          updated_at?: string | null
        }
        Update: {
          ab_test_variant_count?: number | null
          ab_test_winner_selected_at?: string | null
          ab_test_winner_version?: number | null
          campaign_design_json?: Json | null
          campaign_html_body?: string | null
          completed_at?: string | null
          content_json?: Json | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_ab_test?: boolean | null
          name?: string
          scheduled_at?: string | null
          segment_ids?: string[] | null
          segment_rules?: Json | null
          selected_template_id?: string | null
          sender_email?: string
          sender_name?: string
          status?: string
          status_message?: string | null
          subject?: string | null
          template_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_selected_template_id_fkey"
            columns: ["selected_template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_events: {
        Row: {
          campaign_id: string | null
          created_at: string
          email_id: string | null
          event_type: string
          id: string
          message_id: string | null
          metadata: Json | null
          payload: Json | null
          provider_message_id: string | null
          received_at: string
          recipient: string | null
          recipient_email: string | null
          timestamp: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email_id?: string | null
          event_type: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          payload?: Json | null
          provider_message_id?: string | null
          received_at?: string
          recipient?: string | null
          recipient_email?: string | null
          timestamp?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email_id?: string | null
          event_type?: string
          id?: string
          message_id?: string | null
          metadata?: Json | null
          payload?: Json | null
          provider_message_id?: string | null
          received_at?: string
          recipient?: string | null
          recipient_email?: string | null
          timestamp?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_preference_audit_logs: {
        Row: {
          action: string
          admin_user_id: string | null
          changed_at: string
          id: string
          new_status: boolean
          notes: string | null
          previous_status: boolean | null
          user_id: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          changed_at?: string
          id?: string
          new_status: boolean
          notes?: string | null
          previous_status?: boolean | null
          user_id: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          changed_at?: string
          id?: string
          new_status?: boolean
          notes?: string | null
          previous_status?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_preference_audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_processing_locks: {
        Row: {
          created_at: string
          id: string
          lock_key: string
          locked_until: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          lock_key: string
          locked_until: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          lock_key?: string
          locked_until?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_processing_metrics: {
        Row: {
          batch_size: number
          created_at: string | null
          execution_time_ms: number
          failure_count: number
          id: string
          retry_count: number
          success_count: number
          timestamp: string
        }
        Insert: {
          batch_size: number
          created_at?: string | null
          execution_time_ms: number
          failure_count: number
          id?: string
          retry_count: number
          success_count: number
          timestamp: string
        }
        Update: {
          batch_size?: number
          created_at?: string | null
          execution_time_ms?: number
          failure_count?: number
          id?: string
          retry_count?: number
          success_count?: number
          timestamp?: string
        }
        Relationships: []
      }
      email_queue: {
        Row: {
          campaign_id: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          html_content: string | null
          id: string
          last_error: string | null
          priority: number
          processing_started_at: string | null
          provider_message_id: string | null
          recipient_data: Json | null
          recipient_email: string
          retry_count: number
          scheduled_at: string
          sender_email: string | null
          sender_name: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["email_status"]
          subject: string | null
          text_content: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          html_content?: string | null
          id?: string
          last_error?: string | null
          priority?: number
          processing_started_at?: string | null
          provider_message_id?: string | null
          recipient_data?: Json | null
          recipient_email: string
          retry_count?: number
          scheduled_at?: string
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          html_content?: string | null
          id?: string
          last_error?: string | null
          priority?: number
          processing_started_at?: string | null
          provider_message_id?: string | null
          recipient_data?: Json | null
          recipient_email?: string
          retry_count?: number
          scheduled_at?: string
          sender_email?: string | null
          sender_name?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["email_status"]
          subject?: string | null
          text_content?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          active: boolean | null
          category: string
          created_at: string | null
          description: string | null
          design: Json | null
          html_content: string
          id: string
          metadata: Json | null
          name: string
          previous_versions: Json | null
          subcategory: string | null
          subject: string
          tags: string[] | null
          text_content: string
          updated_at: string | null
          variables: Json | null
          version: number | null
        }
        Insert: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          design?: Json | null
          html_content: string
          id?: string
          metadata?: Json | null
          name: string
          previous_versions?: Json | null
          subcategory?: string | null
          subject: string
          tags?: string[] | null
          text_content: string
          updated_at?: string | null
          variables?: Json | null
          version?: number | null
        }
        Update: {
          active?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          design?: Json | null
          html_content?: string
          id?: string
          metadata?: Json | null
          name?: string
          previous_versions?: Json | null
          subcategory?: string | null
          subject?: string
          tags?: string[] | null
          text_content?: string
          updated_at?: string | null
          variables?: Json | null
          version?: number | null
        }
        Relationships: []
      }
      enrollments: {
        Row: {
          course_id: string
          enrolled_at: string
          expires_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          status: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          status: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          enrolled_at?: string
          expires_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          status?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          due_date: string
          id: string
          invoice_number: string
          items: Json
          paid_date: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          due_date: string
          id?: string
          invoice_number: string
          items: Json
          paid_date?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          due_date?: string
          id?: string
          invoice_number?: string
          items?: Json
          paid_date?: string | null
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          attachments: Json | null
          content: string | null
          content_json: Json | null
          created_at: string | null
          description: string | null
          duration: number | null
          id: string
          is_preview: boolean | null
          metadata: Json | null
          module_id: string
          position: number
          status: string
          title: string
          updated_at: string | null
          version: number | null
          video_url: string | null
        }
        Insert: {
          attachments?: Json | null
          content?: string | null
          content_json?: Json | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_preview?: boolean | null
          metadata?: Json | null
          module_id: string
          position: number
          status?: string
          title: string
          updated_at?: string | null
          version?: number | null
          video_url?: string | null
        }
        Update: {
          attachments?: Json | null
          content?: string | null
          content_json?: Json | null
          created_at?: string | null
          description?: string | null
          duration?: number | null
          id?: string
          is_preview?: boolean | null
          metadata?: Json | null
          module_id?: string
          position?: number
          status?: string
          title?: string
          updated_at?: string | null
          version?: number | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          course_id: string | null
          created_at: string | null
          filename: string
          id: string
          metadata: Json | null
          size: number | null
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          filename: string
          id?: string
          metadata?: Json | null
          size?: number | null
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          filename?: string
          id?: string
          metadata?: Json | null
          size?: number | null
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      media_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json
          size: number | null
          title: string
          type: string
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          size?: number | null
          title: string
          type: string
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          size?: number | null
          title?: string
          type?: string
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
      membership_tiers: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          name: string
          price_monthly: number
          price_yearly: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name: string
          price_monthly: number
          price_yearly: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          name?: string
          price_monthly?: number
          price_yearly?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      migration_log: {
        Row: {
          created_at: string
          id: number
          message: string | null
          status: string
          step: string
        }
        Insert: {
          created_at?: string
          id?: number
          message?: string | null
          status: string
          step: string
        }
        Update: {
          created_at?: string
          id?: number
          message?: string | null
          status?: string
          step?: string
        }
        Relationships: []
      }
      module_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          module_id: string
          progress_percentage: number | null
          started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          module_id: string
          progress_percentage?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          module_id?: string
          progress_percentage?: number | null
          started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "module_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean
          metadata: Json
          position: number
          section_id: string | null
          status: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          position: number
          section_id?: string | null
          status?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          position?: number
          section_id?: string | null
          status?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modules_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_methods: {
        Row: {
          created_at: string | null
          expiry_date: string | null
          id: string
          is_default: boolean | null
          last_four: string | null
          provider_token: string | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          provider_token?: string | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          is_default?: boolean | null
          last_four?: string | null
          provider_token?: string | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      permissions: {
        Row: {
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          resource_type: string
          updated_at: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          resource_type: string
          updated_at?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          resource_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      postmark_events: {
        Row: {
          created_at: string
          id: string
          message_id: string | null
          payload: Json
          record_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id?: string | null
          payload: Json
          record_type: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string | null
          payload?: Json
          record_type?: string
        }
        Relationships: []
      }
      processing_locks: {
        Row: {
          acquired_at: string
          created_at: string | null
          expires_at: string
          id: string
          lock_name: string
        }
        Insert: {
          acquired_at: string
          created_at?: string | null
          expires_at: string
          id: string
          lock_name: string
        }
        Update: {
          acquired_at?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          lock_name?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          is_approved: boolean
          product_id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          is_approved?: boolean
          product_id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_product_reviews_user_id_to_profiles"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          first_name: string | null
          id: string
          is_admin: boolean | null
          last_name: string | null
          phone: string | null
          preferences: Json | null
          role: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id: string
          is_admin?: boolean | null
          last_name?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          first_name?: string | null
          id?: string
          is_admin?: boolean | null
          last_name?: string | null
          phone?: string | null
          preferences?: Json | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          permission_id: string
          role_id: string
        }
        Insert: {
          created_at?: string | null
          permission_id: string
          role_id: string
        }
        Update: {
          created_at?: string | null
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          permissions: Json | null
          priority: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          permissions?: Json | null
          priority: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
          priority?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      sections: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_published: boolean
          metadata: Json
          position: number
          title: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          position: number
          title: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_published?: boolean
          metadata?: Json
          position?: number
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sections_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          rules: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rules: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      Session: {
        Row: {
          expires: string
          id: number
          sessionToken: string
          userId: number
        }
        Insert: {
          expires: string
          id?: number
          sessionToken: string
          userId: number
        }
        Update: {
          expires?: string
          id?: number
          sessionToken?: string
          userId?: number
        }
        Relationships: [
          {
            foreignKeyName: "Session_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_customers: {
        Row: {
          accepts_marketing: boolean | null
          created_at: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          orders_count: number | null
          phone: string | null
          shopify_customer_id: number
          state: string | null
          tags: string[] | null
          total_spent: number | null
          unified_profile_id: string | null
          updated_at: string | null
        }
        Insert: {
          accepts_marketing?: boolean | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          orders_count?: number | null
          phone?: string | null
          shopify_customer_id: number
          state?: string | null
          tags?: string[] | null
          total_spent?: number | null
          unified_profile_id?: string | null
          updated_at?: string | null
        }
        Update: {
          accepts_marketing?: boolean | null
          created_at?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          orders_count?: number | null
          phone?: string | null
          shopify_customer_id?: number
          state?: string | null
          tags?: string[] | null
          total_spent?: number | null
          unified_profile_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_customers_unified_profile_id_fkey"
            columns: ["unified_profile_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_order_items: {
        Row: {
          id: string
          order_id: string | null
          price: number | null
          product_id: string | null
          quantity: number | null
          shopify_line_item_id: number
          shopify_product_id: number | null
          shopify_variant_id: number | null
          sku: string | null
          title: string | null
          total_discount: number | null
          variant_id: string | null
          variant_title: string | null
          vendor: string | null
        }
        Insert: {
          id?: string
          order_id?: string | null
          price?: number | null
          product_id?: string | null
          quantity?: number | null
          shopify_line_item_id: number
          shopify_product_id?: number | null
          shopify_variant_id?: number | null
          sku?: string | null
          title?: string | null
          total_discount?: number | null
          variant_id?: string | null
          variant_title?: string | null
          vendor?: string | null
        }
        Update: {
          id?: string
          order_id?: string | null
          price?: number | null
          product_id?: string | null
          quantity?: number | null
          shopify_line_item_id?: number
          shopify_product_id?: number | null
          shopify_variant_id?: number | null
          sku?: string | null
          title?: string | null
          total_discount?: number | null
          variant_id?: string | null
          variant_title?: string | null
          vendor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shopify_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shopify_order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "shopify_product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_orders: {
        Row: {
          cancelled_at: string | null
          closed_at: string | null
          created_at: string | null
          currency: string | null
          customer_id: string | null
          email: string | null
          financial_status: string | null
          fulfillment_status: string | null
          id: string
          landing_site: string | null
          order_number: string | null
          phone: string | null
          processed_at: string | null
          referring_site: string | null
          shopify_order_id: number
          source_name: string | null
          subtotal_price: number | null
          tags: string[] | null
          total_discounts: number | null
          total_price: number | null
          total_tax: number | null
          updated_at: string | null
        }
        Insert: {
          cancelled_at?: string | null
          closed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          email?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          landing_site?: string | null
          order_number?: string | null
          phone?: string | null
          processed_at?: string | null
          referring_site?: string | null
          shopify_order_id: number
          source_name?: string | null
          subtotal_price?: number | null
          tags?: string[] | null
          total_discounts?: number | null
          total_price?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Update: {
          cancelled_at?: string | null
          closed_at?: string | null
          created_at?: string | null
          currency?: string | null
          customer_id?: string | null
          email?: string | null
          financial_status?: string | null
          fulfillment_status?: string | null
          id?: string
          landing_site?: string | null
          order_number?: string | null
          phone?: string | null
          processed_at?: string | null
          referring_site?: string | null
          shopify_order_id?: number
          source_name?: string | null
          subtotal_price?: number | null
          tags?: string[] | null
          total_discounts?: number | null
          total_price?: number | null
          total_tax?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "shopify_customers"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_product_variants: {
        Row: {
          compare_at_price: number | null
          created_at: string | null
          id: string
          price: number | null
          product_id: string | null
          shopify_variant_id: number
          sku: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          price?: number | null
          product_id?: string | null
          shopify_variant_id: number
          sku?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          compare_at_price?: number | null
          created_at?: string | null
          id?: string
          price?: number | null
          product_id?: string | null
          shopify_variant_id?: number
          sku?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shopify_product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_products: {
        Row: {
          collection_handles: string[] | null
          created_at: string | null
          description_html: string | null
          featured_image_url: string | null
          google_drive_file_id: string | null
          handle: string | null
          id: string
          image_urls: Json | null
          is_one_time_purchase: boolean | null
          product_type: string | null
          published_at: string | null
          shopify_product_id: number
          status: string | null
          tags: string[] | null
          title: string | null
          updated_at: string | null
          vendor: string | null
        }
        Insert: {
          collection_handles?: string[] | null
          created_at?: string | null
          description_html?: string | null
          featured_image_url?: string | null
          google_drive_file_id?: string | null
          handle?: string | null
          id?: string
          image_urls?: Json | null
          is_one_time_purchase?: boolean | null
          product_type?: string | null
          published_at?: string | null
          shopify_product_id: number
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Update: {
          collection_handles?: string[] | null
          created_at?: string | null
          description_html?: string | null
          featured_image_url?: string | null
          google_drive_file_id?: string | null
          handle?: string | null
          id?: string
          image_urls?: Json | null
          is_one_time_purchase?: boolean | null
          product_type?: string | null
          published_at?: string | null
          shopify_product_id?: number
          status?: string | null
          tags?: string[] | null
          title?: string | null
          updated_at?: string | null
          vendor?: string | null
        }
        Relationships: []
      }
      shopify_webhook_queue: {
        Row: {
          id: string
          payload: Json
          processed: boolean
          processed_at: string | null
          received_at: string
          topic: string
        }
        Insert: {
          id?: string
          payload: Json
          processed?: boolean
          processed_at?: string | null
          received_at?: string
          topic: string
        }
        Update: {
          id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
          received_at?: string
          topic?: string
        }
        Relationships: []
      }
      subscription_payments: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          created_at: string | null
          id: string
          membership_id: string
          status: string
          transaction_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          created_at?: string | null
          id?: string
          membership_id: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          created_at?: string | null
          id?: string
          membership_id?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "user_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      systemeio: {
        Row: {
          "Date Registered": string
          Email: string
          "First name": string | null
          "Last name": string | null
          Tag: string | null
        }
        Insert: {
          "Date Registered": string
          Email: string
          "First name"?: string | null
          "Last name"?: string | null
          Tag?: string | null
        }
        Update: {
          "Date Registered"?: string
          Email?: string
          "First name"?: string | null
          "Last name"?: string | null
          Tag?: string | null
        }
        Relationships: []
      }
      systemeio_backup: {
        Row: {
          "Date Registered": string | null
          Email: string | null
          "First name": string | null
          "Last name": string | null
          Tag: string | null
        }
        Insert: {
          "Date Registered"?: string | null
          Email?: string | null
          "First name"?: string | null
          "Last name"?: string | null
          Tag?: string | null
        }
        Update: {
          "Date Registered"?: string | null
          Email?: string | null
          "First name"?: string | null
          "Last name"?: string | null
          Tag?: string | null
        }
        Relationships: []
      }
      tag_types: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          metadata: Json | null
          name: string
          parent_id: string | null
          type_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name: string
          parent_id?: string | null
          type_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          metadata?: Json | null
          name?: string
          parent_id?: string | null
          type_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tags_parent_id"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_tags_type_id"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "tag_types"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          contact_email: string | null
          created_at: string | null
          currency: string
          expires_at: string | null
          external_id: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          settled_at: string | null
          status: string
          transaction_type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          contact_email?: string | null
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          settled_at?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          contact_email?: string | null
          created_at?: string | null
          currency?: string
          expires_at?: string | null
          external_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          settled_at?: string | null
          status?: string
          transaction_type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      unified_profiles: {
        Row: {
          acquisition_source: string | null
          admin_metadata: Json | null
          created_at: string
          email: string
          email_bounced: boolean
          email_last_spam_at: string | null
          email_marketing_subscribed: boolean
          email_spam_complained: boolean | null
          first_name: string | null
          id: string
          last_login_at: string | null
          last_name: string | null
          login_count: number | null
          phone: string | null
          status: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          acquisition_source?: string | null
          admin_metadata?: Json | null
          created_at?: string
          email: string
          email_bounced?: boolean
          email_last_spam_at?: string | null
          email_marketing_subscribed?: boolean
          email_spam_complained?: boolean | null
          first_name?: string | null
          id: string
          last_login_at?: string | null
          last_name?: string | null
          login_count?: number | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          acquisition_source?: string | null
          admin_metadata?: Json | null
          created_at?: string
          email?: string
          email_bounced?: boolean
          email_last_spam_at?: string | null
          email_marketing_subscribed?: boolean
          email_spam_complained?: boolean | null
          first_name?: string | null
          id?: string
          last_login_at?: string | null
          last_name?: string | null
          login_count?: number | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      User: {
        Row: {
          email: string | null
          emailVerified: string | null
          id: number
          image: string | null
          name: string | null
          password: string | null
        }
        Insert: {
          email?: string | null
          emailVerified?: string | null
          id?: number
          image?: string | null
          name?: string | null
          password?: string | null
        }
        Update: {
          email?: string | null
          emailVerified?: string | null
          id?: number
          image?: string | null
          name?: string | null
          password?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_carts: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          price: number
          product_id: string
          quantity: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          price: number
          product_id: string
          quantity?: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          price?: number
          product_id?: string
          quantity?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_carts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_email_preferences: {
        Row: {
          course_updates: boolean | null
          created_at: string | null
          id: string
          marketing_emails: boolean | null
          newsletter: boolean | null
          transactional_emails: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_updates?: boolean | null
          created_at?: string | null
          id?: string
          marketing_emails?: boolean | null
          newsletter?: boolean | null
          transactional_emails?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_updates?: boolean | null
          created_at?: string | null
          id?: string
          marketing_emails?: boolean | null
          newsletter?: boolean | null
          transactional_emails?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_enrollments: {
        Row: {
          course_id: string
          created_at: string | null
          enrolled_at: string | null
          expires_at: string | null
          id: string
          payment_id: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          enrolled_at?: string | null
          expires_at?: string | null
          id?: string
          payment_id?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      user_memberships: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          payment_reference: string | null
          started_at: string | null
          status: string
          tier_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          started_at?: string | null
          status?: string
          tier_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_reference?: string | null
          started_at?: string | null
          status?: string
          tier_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "membership_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_notes: {
        Row: {
          admin_id: string
          created_at: string
          id: string
          is_pinned: boolean | null
          note_text: string
          note_type: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note_text: string
          note_type?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean | null
          note_text?: string
          note_type?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          last_position: number | null
          lesson_id: string
          progress_percentage: number | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_position?: number | null
          lesson_id: string
          progress_percentage?: number | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          last_position?: number | null
          lesson_id?: string
          progress_percentage?: number | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_segments: {
        Row: {
          created_at: string
          id: string
          segment_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          segment_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          segment_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_segments_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tags: {
        Row: {
          assigned_at: string
          tag_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          tag_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_time_spent: {
        Row: {
          created_at: string | null
          duration_seconds: number
          id: string
          lesson_id: string
          recorded_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_seconds: number
          id?: string
          lesson_id: string
          recorded_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number
          id?: string
          lesson_id?: string
          recorded_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_time_spent_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      VerificationToken: {
        Row: {
          expires: string
          identifier: string
          token: string
        }
        Insert: {
          expires: string
          identifier: string
          token: string
        }
        Update: {
          expires?: string
          identifier?: string
          token?: string
        }
        Relationships: []
      }
      wishlist_items: {
        Row: {
          created_at: string
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shopify_products"
            referencedColumns: ["id"]
          },
        ]
      }
      xendit: {
        Row: {
          Amount: number | null
          "Bank Name": string | null
          "Created Timestamp": string | null
          Currency: string | null
          "Customer Email": string | null
          "Customer Mobile Number": string | null
          "Customer Name": string | null
          Description: string | null
          Email: string | null
          "Expiry Date": string | null
          "External ID": string
          Fee: string | null
          "Invoice ID": string | null
          "Paid Timestamp": string | null
          "Payment Method": string | null
          "Promotion(s)": string | null
          "Received Amount": string | null
          "Settled Timestamp": string | null
          Status: string | null
          Timezone: string | null
          "VA Number": string | null
        }
        Insert: {
          Amount?: number | null
          "Bank Name"?: string | null
          "Created Timestamp"?: string | null
          Currency?: string | null
          "Customer Email"?: string | null
          "Customer Mobile Number"?: string | null
          "Customer Name"?: string | null
          Description?: string | null
          Email?: string | null
          "Expiry Date"?: string | null
          "External ID": string
          Fee?: string | null
          "Invoice ID"?: string | null
          "Paid Timestamp"?: string | null
          "Payment Method"?: string | null
          "Promotion(s)"?: string | null
          "Received Amount"?: string | null
          "Settled Timestamp"?: string | null
          Status?: string | null
          Timezone?: string | null
          "VA Number"?: string | null
        }
        Update: {
          Amount?: number | null
          "Bank Name"?: string | null
          "Created Timestamp"?: string | null
          Currency?: string | null
          "Customer Email"?: string | null
          "Customer Mobile Number"?: string | null
          "Customer Name"?: string | null
          Description?: string | null
          Email?: string | null
          "Expiry Date"?: string | null
          "External ID"?: string
          Fee?: string | null
          "Invoice ID"?: string | null
          "Paid Timestamp"?: string | null
          "Payment Method"?: string | null
          "Promotion(s)"?: string | null
          "Received Amount"?: string | null
          "Settled Timestamp"?: string | null
          Status?: string | null
          Timezone?: string | null
          "VA Number"?: string | null
        }
        Relationships: []
      }
      xendit_backup: {
        Row: {
          Amount: number | null
          "Bank Name": string | null
          "Created Timestamp": string | null
          Currency: string | null
          "Customer Email": string | null
          "Customer Mobile Number": string | null
          "Customer Name": string | null
          Description: string | null
          Email: string | null
          "Expiry Date": string | null
          "External ID": string | null
          Fee: string | null
          "Invoice ID": string | null
          "Paid Timestamp": string | null
          "Payment Method": string | null
          "Promotion(s)": string | null
          "Received Amount": string | null
          "Settled Timestamp": string | null
          Status: string | null
          Timezone: string | null
          "VA Number": string | null
        }
        Insert: {
          Amount?: number | null
          "Bank Name"?: string | null
          "Created Timestamp"?: string | null
          Currency?: string | null
          "Customer Email"?: string | null
          "Customer Mobile Number"?: string | null
          "Customer Name"?: string | null
          Description?: string | null
          Email?: string | null
          "Expiry Date"?: string | null
          "External ID"?: string | null
          Fee?: string | null
          "Invoice ID"?: string | null
          "Paid Timestamp"?: string | null
          "Payment Method"?: string | null
          "Promotion(s)"?: string | null
          "Received Amount"?: string | null
          "Settled Timestamp"?: string | null
          Status?: string | null
          Timezone?: string | null
          "VA Number"?: string | null
        }
        Update: {
          Amount?: number | null
          "Bank Name"?: string | null
          "Created Timestamp"?: string | null
          Currency?: string | null
          "Customer Email"?: string | null
          "Customer Mobile Number"?: string | null
          "Customer Name"?: string | null
          Description?: string | null
          Email?: string | null
          "Expiry Date"?: string | null
          "External ID"?: string | null
          Fee?: string | null
          "Invoice ID"?: string | null
          "Paid Timestamp"?: string | null
          "Payment Method"?: string | null
          "Promotion(s)"?: string | null
          "Received Amount"?: string | null
          "Settled Timestamp"?: string | null
          Status?: string | null
          Timezone?: string | null
          "VA Number"?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      marketing_performance_view: {
        Row: {
          ad_id: string | null
          ad_name: string | null
          ad_status: string | null
          adset_id: string | null
          adset_name: string | null
          adset_status: string | null
          attributed_revenue: number | null
          campaign_id: string | null
          campaign_name: string | null
          campaign_objective: string | null
          campaign_status: string | null
          clicks: number | null
          conversion_event: string | null
          date: string | null
          enrollment_id: string | null
          fb_ad_id: string | null
          fb_adset_id: string | null
          fb_campaign_id: string | null
          impressions: number | null
          source_channel: string | null
          spend: number | null
          spend_currency: string | null
          transaction_id: string | null
        }
        Relationships: []
      }
      marketing_source_view: {
        Row: {
          acquisition_source: string | null
          paid_user_count: number | null
          user_count: number | null
        }
        Relationships: []
      }
      monthly_enrollments_view: {
        Row: {
          course_id: string | null
          enrollment_count: number | null
          month: string | null
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_analysis_view: {
        Row: {
          avg_transaction_value: number | null
          month: string | null
          total_revenue: number | null
          transaction_count: number | null
          transaction_type: string | null
        }
        Relationships: []
      }
      unified_transactions_view: {
        Row: {
          amount: number | null
          created_at: string | null
          currency: string | null
          email: string | null
          external_reference: string | null
          payment_method: string | null
          product_details: Json | null
          source_platform: string | null
          status: string | null
          transaction_datetime: string | null
          transaction_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
      user_purchase_history_view: {
        Row: {
          amount: number | null
          currency: string | null
          email: string | null
          first_name: string | null
          last_name: string | null
          payment_method: string | null
          product_details: Json | null
          product_type: string | null
          purchase_date: string | null
          record_id: string | null
          record_type: string | null
          reference: string | null
          status: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      acquire_lock: {
        Args: { p_key: string; p_timeout_seconds?: number }
        Returns: boolean
      }
      add_jsonb_column: {
        Args: { table_name: string; column_name: string }
        Returns: undefined
      }
      calculate_enrollment_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          course_id: string
          total_enrollments: number
          active_enrollments: number
        }[]
      }
      check_column_exists: {
        Args: { table_name: string; column_name: string }
        Returns: boolean
      }
      check_if_user_is_admin: {
        Args: { user_id: string }
        Returns: boolean
      }
      execute_sql: {
        Args: { sql: string }
        Returns: undefined
      }
      generate_enrollments: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_daily_p2p_enrollment_trends: {
        Args: { start_date: string; end_date: string; target_course_id: string }
        Returns: {
          date: string
          count: number
        }[]
      }
      get_monthly_p2p_enrollment_trends: {
        Args: { start_date: string; end_date: string; target_course_id: string }
        Returns: {
          month_start_date: string
          count: number
        }[]
      }
      get_monthly_revenue_trends: {
        Args: { p_start_date: string; p_end_date: string }
        Returns: {
          month_start: string
          total_revenue: number
        }[]
      }
      get_revenue_by_product: {
        Args: {
          p_start_date?: string
          p_end_date?: string
          p_source_platform?: string
        }
        Returns: {
          product_identifier: string
          product_name: string
          source_platform: string
          total_revenue: number
          units_sold: number
          average_transaction_value: number
        }[]
      }
      get_revenue_trends: {
        Args: {
          p_start_date: string
          p_end_date: string
          p_granularity?: string
          p_source_platform?: string
        }
        Returns: {
          date: string
          revenue: number
        }[]
      }
      get_store_products_with_ratings: {
        Args: { search_term?: string }
        Returns: {
          id: string
          title: string
          handle: string
          featured_image_url: string
          price: number
          compare_at_price: number
          average_rating: number
          review_count: number
        }[]
      }
      get_weekly_p2p_enrollment_trends: {
        Args: { start_date: string; end_date: string; target_course_id: string }
        Returns: {
          week_start_date: string
          count: number
        }[]
      }
      gtrgm_compress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_decompress: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_in: {
        Args: { "": unknown }
        Returns: unknown
      }
      gtrgm_options: {
        Args: { "": unknown }
        Returns: undefined
      }
      gtrgm_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      has_permission: {
        Args: { user_id: string; required_permission: string }
        Returns: boolean
      }
      increment_campaign_metric: {
        Args: {
          p_campaign_id: string
          p_metric_name: string
          p_increment_value?: number
        }
        Returns: undefined
      }
      log_admin_action: {
        Args: {
          p_admin_id: string
          p_user_id: string
          p_action_type: string
          p_entity_type: string
          p_entity_id: string
          p_previous_state?: Json
          p_new_state?: Json
          p_ip_address?: string
          p_user_agent?: string
        }
        Returns: string
      }
      log_user_activity: {
        Args: {
          p_user_id: string
          p_activity_type: string
          p_resource_type?: string
          p_resource_id?: string
          p_metadata?: Json
          p_ip_address?: string
          p_user_agent?: string
          p_session_id?: string
        }
        Returns: string
      }
      migrate_profiles: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      migrate_profiles_upsert: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      migrate_transactions: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      migrate_transactions_upsert: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      move_lesson: {
        Args: {
          p_lesson_id: string
          p_target_module_id: string
          p_new_position: number
        }
        Returns: undefined
      }
      release_lock: {
        Args: { p_key: string }
        Returns: boolean
      }
      reorder_lessons: {
        Args: { p_module_id: string; p_lesson_order: Json }
        Returns: undefined
      }
      reorder_modules: {
        Args: { p_course_id: string; p_module_order: Json }
        Returns: undefined
      }
      search_users: {
        Args: {
          p_search_term?: string
          p_status?: string
          p_tags?: string[]
          p_acquisition_source?: string
          p_created_after?: string
          p_created_before?: string
          p_has_transactions?: boolean
          p_has_enrollments?: boolean
          p_limit?: number
          p_offset?: number
        }
        Returns: {
          id: string
          email: string
          first_name: string
          last_name: string
          phone: string
          tags: string[]
          acquisition_source: string
          status: string
          admin_metadata: Json
          created_at: string
          updated_at: string
          last_login_at: string
          login_count: number
          transaction_count: number
          enrollment_count: number
          total_spent: number
        }[]
      }
      set_limit: {
        Args: { "": number }
        Returns: number
      }
      show_limit: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      show_trgm: {
        Args: { "": string }
        Returns: string[]
      }
      sync_all_user_tags_from_unified_profiles: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      sync_new_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      sync_profile_data: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      update_module_positions: {
        Args: { module_updates: Json[] }
        Returns: undefined
      }
      update_module_positions_transaction: {
        Args:
          | { p_course_id: string; p_updates: Json[] }
          | { p_course_id: string; p_updates: Json }
        Returns: undefined
      }
      update_revenue_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          month: string
          total_revenue: number
          avg_transaction_value: number
        }[]
      }
      upsert_user_progress: {
        Args: {
          p_user_id: string
          p_lesson_id: string
          p_status: string
          p_progress_percentage: number
          p_last_position: number
          p_completed_at: string
        }
        Returns: Json
      }
    }
    Enums: {
      batch_status: "pending" | "processing" | "completed" | "failed"
      email_status: "pending" | "processing" | "sent" | "failed" | "retrying"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      batch_status: ["pending", "processing", "completed", "failed"],
      email_status: ["pending", "processing", "sent", "failed", "retrying"],
    },
  },
} as const
