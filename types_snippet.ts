
crm_activities: {
    Row: {
        id: string
        created_at: string
        occurred_at: string
        contact_email: string
        contact_id: string | null
        type: string
        metadata: Json
    }
    Insert: {
        id ?: string
        created_at ?: string
        occurred_at ?: string
        contact_email: string
        contact_id ?: string | null
        type: string
        metadata ?: Json
    }
    Update: {
        id ?: string
        created_at ?: string
        occurred_at ?: string
        contact_email ?: string
        contact_id ?: string | null
        type ?: string
        metadata ?: Json
    }
    Relationships: [
        {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "unified_profiles"
            referencedColumns: ["id"]
        }
    ]
}
crm_smart_lists: {
    Row: {
        id: string
        created_at: string
        updated_at: string
        name: string
        description: string | null
        rules: Json
        last_count: number | null
        last_counted_at: string | null
    }
    Insert: {
        id ?: string
        created_at ?: string
        updated_at ?: string
        name: string
        description ?: string | null
        rules ?: Json
        last_count ?: number | null
        last_counted_at ?: string | null
    }
    Update: {
        id ?: string
        created_at ?: string
        updated_at ?: string
        name ?: string
        description ?: string | null
        rules ?: Json
        last_count ?: number | null
        last_counted_at ?: string | null
    }
    Relationships: []
}
email_campaigns_v2: {
    Row: {
        id: string
        created_at: string
        updated_at: string
        name: string
        subject: string | null
        smart_list_id: string | null
        status: string
        scheduled_at: string | null
        content_design: Json | null
        content_html: string | null
        stats: Json
    }
    Insert: {
        id ?: string
        created_at ?: string
        updated_at ?: string
        name: string
        subject ?: string | null
        smart_list_id ?: string | null
        status ?: string
        scheduled_at ?: string | null
        content_design ?: Json | null
        content_html ?: string | null
        stats ?: Json
    }
    Update: {
        id ?: string
        created_at ?: string
        updated_at ?: string
        name ?: string
        subject ?: string | null
        smart_list_id ?: string | null
        status ?: string
        scheduled_at ?: string | null
        content_design ?: Json | null
        content_html ?: string | null
        stats ?: Json
    }
    Relationships: [
        {
            foreignKeyName: "email_campaigns_v2_smart_list_id_fkey"
            columns: ["smart_list_id"]
            isOneToOne: false
            referencedRelation: "crm_smart_lists"
            referencedColumns: ["id"]
        }
    ]
}
email_jobs: {
    Row: {
        id: string
        created_at: string
        updated_at: string
        campaign_id: string | null
        recipient_email: string
        recipient_resource_type: string
        recipient_resource_id: string
        status: string
        stream_type: string
        remote_message_id: string | null
        error_message: string | null
        retry_count: number
    }
    Insert: {
        id ?: string
        created_at ?: string
        updated_at ?: string
        campaign_id ?: string | null
        recipient_email: string
        recipient_resource_type: string
        recipient_resource_id: string
        status ?: string
        stream_type ?: string
        remote_message_id ?: string | null
        error_message ?: string | null
        retry_count ?: number
    }
    Update: {
        id ?: string
        created_at ?: string
        updated_at ?: string
        campaign_id ?: string | null
        recipient_email ?: string
        recipient_resource_type ?: string
        recipient_resource_id ?: string
        status ?: string
        stream_type ?: string
        remote_message_id ?: string | null
        error_message ?: string | null
        retry_count ?: number
    }
    Relationships: [
        {
            foreignKeyName: "email_jobs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns_v2"
            referencedColumns: ["id"]
        }
    ]
}
