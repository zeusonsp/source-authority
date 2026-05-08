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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          company_id: string
          created_at: string
          data: Json
          id: string
          severity: string
          source: string
          status: string
          triaged_at: string | null
          triaged_by: string | null
          type: string
        }
        Insert: {
          company_id: string
          created_at?: string
          data?: Json
          id?: string
          severity?: string
          source: string
          status?: string
          triaged_at?: string | null
          triaged_by?: string | null
          type: string
        }
        Update: {
          company_id?: string
          created_at?: string
          data?: Json
          id?: string
          severity?: string
          source?: string
          status?: string
          triaged_at?: string | null
          triaged_by?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_triaged_by_fkey"
            columns: ["triaged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          company_id: string
          created_at: string
          id: string
          payload: Json
        }
        Insert: {
          action: string
          actor_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          payload?: Json
        }
        Update: {
          action?: string
          actor_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          billing_exempt: boolean
          billing_status: string
          cnpj: string | null
          created_at: string
          created_by: string | null
          default_redirect_url: string | null
          id: string
          name: string
          owned_domains: string[]
          plan: string
          plan_renewed_at: string | null
          protected_brand_terms: string[]
          segment: string | null
          size: string | null
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_exempt?: boolean
          billing_status?: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          default_redirect_url?: string | null
          id?: string
          name: string
          owned_domains?: string[]
          plan?: string
          plan_renewed_at?: string | null
          protected_brand_terms?: string[]
          segment?: string | null
          size?: string | null
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_exempt?: boolean
          billing_status?: string
          cnpj?: string | null
          created_at?: string
          created_by?: string | null
          default_redirect_url?: string | null
          id?: string
          name?: string
          owned_domains?: string[]
          plan?: string
          plan_renewed_at?: string | null
          protected_brand_terms?: string[]
          segment?: string | null
          size?: string | null
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "companies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversions: {
        Row: {
          amount_cents: number
          company_id: string
          created_at: string
          currency: string
          external_id: string
          id: string
          occurred_at: string
          reseller_code: string | null
          session_id: string | null
          source_event_id: string | null
        }
        Insert: {
          amount_cents: number
          company_id: string
          created_at?: string
          currency?: string
          external_id: string
          id?: string
          occurred_at?: string
          reseller_code?: string | null
          session_id?: string | null
          source_event_id?: string | null
        }
        Update: {
          amount_cents?: number
          company_id?: string
          created_at?: string
          currency?: string
          external_id?: string
          id?: string
          occurred_at?: string
          reseller_code?: string | null
          session_id?: string | null
          source_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_source_event_id_fkey"
            columns: ["source_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_leads: {
        Row: {
          company: string | null
          created_at: string
          email: string
          employees: string
          id: string
          ip_address: string | null
          name: string
          phone: string | null
          referrer: string | null
          use_case: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          employees: string
          id?: string
          ip_address?: string | null
          name: string
          phone?: string | null
          referrer?: string | null
          use_case?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          employees?: string
          id?: string
          ip_address?: string | null
          name?: string
          phone?: string | null
          referrer?: string | null
          use_case?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: []
      }
      events: {
        Row: {
          browser_name: string | null
          browser_version: string | null
          color_depth: number | null
          company_id: string
          created_at: string
          device: string | null
          device_model: string | null
          device_pixel_ratio: number | null
          device_vendor: string | null
          id: string
          ip_asn: number | null
          ip_city: string | null
          ip_continent: string | null
          ip_country: string | null
          ip_latitude: number | null
          ip_longitude: number | null
          ip_organization: string | null
          ip_postal_code: string | null
          ip_region: string | null
          ip_timezone: string | null
          lang: string | null
          network_type: string | null
          os_name: string | null
          os_version: string | null
          referrer: string | null
          referrer_code: string | null
          screen_height: number | null
          screen_width: number | null
          session_id: string | null
          url_path: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          viewport_height: number | null
          viewport_width: number | null
        }
        Insert: {
          browser_name?: string | null
          browser_version?: string | null
          color_depth?: number | null
          company_id: string
          created_at?: string
          device?: string | null
          device_model?: string | null
          device_pixel_ratio?: number | null
          device_vendor?: string | null
          id?: string
          ip_asn?: number | null
          ip_city?: string | null
          ip_continent?: string | null
          ip_country?: string | null
          ip_latitude?: number | null
          ip_longitude?: number | null
          ip_organization?: string | null
          ip_postal_code?: string | null
          ip_region?: string | null
          ip_timezone?: string | null
          lang?: string | null
          network_type?: string | null
          os_name?: string | null
          os_version?: string | null
          referrer?: string | null
          referrer_code?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          url_path?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Update: {
          browser_name?: string | null
          browser_version?: string | null
          color_depth?: number | null
          company_id?: string
          created_at?: string
          device?: string | null
          device_model?: string | null
          device_pixel_ratio?: number | null
          device_vendor?: string | null
          id?: string
          ip_asn?: number | null
          ip_city?: string | null
          ip_continent?: string | null
          ip_country?: string | null
          ip_latitude?: number | null
          ip_longitude?: number | null
          ip_organization?: string | null
          ip_postal_code?: string | null
          ip_region?: string | null
          ip_timezone?: string | null
          lang?: string | null
          network_type?: string | null
          os_name?: string | null
          os_version?: string | null
          referrer?: string | null
          referrer_code?: string | null
          screen_height?: number | null
          screen_width?: number | null
          session_id?: string | null
          url_path?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          viewport_height?: number | null
          viewport_width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      memberships: {
        Row: {
          company_id: string
          created_at: string
          id: string
          invited_by: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          invited_by?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      reseller_codes: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reseller_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reseller_codes_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          company_id: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          payment_provider: string
          processed_at: string | null
          provider_event_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          payment_provider?: string
          processed_at?: string | null
          provider_event_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          payment_provider?: string
          processed_at?: string | null
          provider_event_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_subscription_event: {
        Args: {
          _company_id: string
          _event_type: string
          _new_plan?: string
          _new_status?: string
          _payload: Json
          _provider: string
          _provider_event_id: string
          _renewed_at?: string
          _stripe_customer_id?: string
          _stripe_sub_id?: string
          _trial_ends_at?: string
        }
        Returns: string
      }
      create_company: {
        Args: {
          _cnpj?: string
          _name: string
          _segment?: string
          _size?: string
          _slug: string
        }
        Returns: string
      }
      is_company_admin: { Args: { _company_id: string }; Returns: boolean }
      is_company_member: { Args: { _company_id: string }; Returns: boolean }
      is_slug_available: { Args: { _slug: string }; Returns: boolean }
      log_audit_event: {
        Args: { _action: string; _company_id: string; _payload?: Json }
        Returns: string
      }
      triage_alert: {
        Args: { _alert_id: string; _new_status: string; _note?: string }
        Returns: string
      }
      update_company: {
        Args: {
          _company_id: string
          _default_redirect_url?: string
          _name: string
          _segment: string
          _size: string
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
