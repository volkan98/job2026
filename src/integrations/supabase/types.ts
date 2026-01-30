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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
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
