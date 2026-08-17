export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      auto_campaigns: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_search_cycle: number | null
          cv_file_path: string | null
          email_style: string
          id: string
          include_risky: boolean | null
          last_processed_at: string | null
          max_search_cycles: number | null
          only_selected_city: boolean | null
          pause_reason: string | null
          resume_at: string | null
          search_keywords: string[]
          search_location: string
          search_location_query: string | null
          search_radius: number
          started_at: string | null
          status: string
          target_total: number
          total_failed: number | null
          total_found: number | null
          total_generated: number | null
          total_sent: number | null
          total_skipped: number | null
          total_validated: number | null
          updated_at: string | null
          user_city: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_search_cycle?: number | null
          cv_file_path?: string | null
          email_style?: string
          id?: string
          include_risky?: boolean | null
          last_processed_at?: string | null
          max_search_cycles?: number | null
          only_selected_city?: boolean | null
          pause_reason?: string | null
          resume_at?: string | null
          search_keywords?: string[]
          search_location: string
          search_location_query?: string | null
          search_radius?: number
          started_at?: string | null
          status?: string
          target_total?: number
          total_failed?: number | null
          total_found?: number | null
          total_generated?: number | null
          total_sent?: number | null
          total_skipped?: number | null
          total_validated?: number | null
          updated_at?: string | null
          user_city?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_search_cycle?: number | null
          cv_file_path?: string | null
          email_style?: string
          id?: string
          include_risky?: boolean | null
          last_processed_at?: string | null
          max_search_cycles?: number | null
          only_selected_city?: boolean | null
          pause_reason?: string | null
          resume_at?: string | null
          search_keywords?: string[]
          search_location?: string
          search_location_query?: string | null
          search_radius?: number
          started_at?: string | null
          status?: string
          target_total?: number
          total_failed?: number | null
          total_found?: number | null
          total_generated?: number | null
          total_sent?: number | null
          total_skipped?: number | null
          total_validated?: number | null
          updated_at?: string | null
          user_city?: string | null
          user_id?: string
        }
        Relationships: []
      }
      campaign_events: {
        Row: {
          campaign_id: string
          created_at: string | null
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_events_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "auto_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_queue: {
        Row: {
          campaign_id: string
          company_address: string | null
          company_city: string | null
          company_email: string | null
          company_name: string
          company_phone: string | null
          company_sector: string | null
          company_source: string | null
          company_website: string | null
          confidence_score: number | null
          contact_final_status: string | null
          created_at: string | null
          email_body: string | null
          email_firma: string | null
          email_source_url: string | null
          email_subject: string | null
          error_message: string | null
          id: string
          max_retries: number | null
          next_retry_at: string | null
          processed_at: string | null
          retry_count: number | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_name: string
          company_phone?: string | null
          company_sector?: string | null
          company_source?: string | null
          company_website?: string | null
          confidence_score?: number | null
          contact_final_status?: string | null
          created_at?: string | null
          email_body?: string | null
          email_firma?: string | null
          email_source_url?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          processed_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          company_address?: string | null
          company_city?: string | null
          company_email?: string | null
          company_name?: string
          company_phone?: string | null
          company_sector?: string | null
          company_source?: string | null
          company_website?: string | null
          confidence_score?: number | null
          contact_final_status?: string | null
          created_at?: string | null
          email_body?: string | null
          email_firma?: string | null
          email_source_url?: string | null
          email_subject?: string | null
          error_message?: string | null
          id?: string
          max_retries?: number | null
          next_retry_at?: string | null
          processed_at?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "auto_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          city: string | null
          contact_type: string | null
          created_at: string
          email: string | null
          id: string
          match_score: number | null
          name: string
          notes: string | null
          phone: string | null
          sector: string | null
          source: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          match_score?: number | null
          name: string
          notes?: string | null
          phone?: string | null
          sector?: string | null
          source?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          contact_type?: string | null
          created_at?: string
          email?: string | null
          id?: string
          match_score?: number | null
          name?: string
          notes?: string | null
          phone?: string | null
          sector?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      email_oauth_tokens: {
        Row: {
          access_token: string
          created_at: string
          email_address: string | null
          id: string
          provider: string
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          email_address?: string | null
          id?: string
          provider: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          email_address?: string | null
          id?: string
          provider?: string
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sent_emails: {
        Row: {
          body: string | null
          company_id: string | null
          company_name: string
          created_at: string
          cv_version: string | null
          domain: string
          email: string
          error_message: string | null
          id: string
          sent_at: string
          status: string
          subject: string
          user_id: string
        }
        Insert: {
          body?: string | null
          company_id?: string | null
          company_name: string
          created_at?: string
          cv_version?: string | null
          domain: string
          email: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          subject: string
          user_id: string
        }
        Update: {
          body?: string | null
          company_id?: string | null
          company_name?: string
          created_at?: string
          cv_version?: string | null
          domain?: string
          email?: string
          error_message?: string | null
          id?: string
          sent_at?: string
          status?: string
          subject?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sent_emails_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          availability: string | null
          cap: string | null
          city: string | null
          created_at: string
          cv_file_path: string | null
          cv_full_summary: string | null
          cv_short_summary: string | null
          email: string | null
          exclude_same_domain: boolean | null
          full_name: string | null
          id: string
          phone: string | null
          profile_summary: string | null
          search_radius_km: number | null
          shift_preference: string | null
          skills: string[] | null
          target_role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          cap?: string | null
          city?: string | null
          created_at?: string
          cv_file_path?: string | null
          cv_full_summary?: string | null
          cv_short_summary?: string | null
          email?: string | null
          exclude_same_domain?: boolean | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_summary?: string | null
          search_radius_km?: number | null
          shift_preference?: string | null
          skills?: string[] | null
          target_role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          cap?: string | null
          city?: string | null
          created_at?: string
          cv_file_path?: string | null
          cv_full_summary?: string | null
          cv_short_summary?: string | null
          email?: string | null
          exclude_same_domain?: boolean | null
          full_name?: string | null
          id?: string
          phone?: string | null
          profile_summary?: string | null
          search_radius_km?: number | null
          shift_preference?: string | null
          skills?: string[] | null
          target_role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_duplicate_contact: {
        Args: {
          p_check_domain?: boolean
          p_company_name: string
          p_email: string
          p_user_id: string
        }
        Returns: {
          duplicate_type: string
          is_duplicate: boolean
          last_sent_date: string
          original_company: string
        }[]
      }
      extract_email_domain: { Args: { email_address: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
