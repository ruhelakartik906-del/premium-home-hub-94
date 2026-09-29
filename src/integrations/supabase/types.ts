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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      gateway_secrets: {
        Row: {
          id: number
          key_secret: string | null
          updated_at: string
          webhook_secret: string | null
        }
        Insert: {
          id?: number
          key_secret?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Update: {
          id?: number
          key_secret?: string | null
          updated_at?: string
          webhook_secret?: string | null
        }
        Relationships: []
      }
      interests: {
        Row: {
          admin_note: string | null
          buyer_id: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string
          preferred_time: string | null
          property_id: string
          status: string
        }
        Insert: {
          admin_note?: string | null
          buyer_id: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone: string
          preferred_time?: string | null
          property_id: string
          status?: string
        }
        Update: {
          admin_note?: string | null
          buyer_id?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string
          preferred_time?: string | null
          property_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "interests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_submissions: {
        Row: {
          account_holder: string
          account_number: string
          admin_note: string | null
          bank_name: string
          created_at: string
          gov_id: string
          gst: string | null
          id: string
          ifsc: string
          pan: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          account_holder: string
          account_number: string
          admin_note?: string | null
          bank_name: string
          created_at?: string
          gov_id: string
          gst?: string | null
          id?: string
          ifsc: string
          pan: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          account_holder?: string
          account_number?: string
          admin_note?: string | null
          bank_name?: string
          created_at?: string
          gov_id?: string
          gst?: string | null
          id?: string
          ifsc?: string
          pan?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_settings: {
        Row: {
          activation_fee: number
          enabled: boolean
          id: number
          key_id: string | null
          mode: string
          provider: string
          updated_at: string
        }
        Insert: {
          activation_fee?: number
          enabled?: boolean
          id?: number
          key_id?: string | null
          mode?: string
          provider?: string
          updated_at?: string
        }
        Update: {
          activation_fee?: number
          enabled?: boolean
          id?: number
          key_id?: string | null
          mode?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: number
          reminder_days_before: number
          updated_at: string
          verification_days: number
        }
        Insert: {
          id?: number
          reminder_days_before?: number
          updated_at?: string
          verification_days?: number
        }
        Update: {
          id?: number
          reminder_days_before?: number
          updated_at?: string
          verification_days?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          activated_at: string
          address: string | null
          business_type: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          created_by_admin: boolean
          dob: string | null
          email: string
          full_name: string
          gender: string | null
          id: string
          mobile: string | null
          pincode: string | null
          reminder_sent_at: string | null
          state: string | null
          status: string
          updated_at: string
          verification_due_at: string
          verification_status: string
        }
        Insert: {
          account_type?: string
          activated_at?: string
          address?: string | null
          business_type?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by_admin?: boolean
          dob?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id: string
          mobile?: string | null
          pincode?: string | null
          reminder_sent_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          verification_due_at?: string
          verification_status?: string
        }
        Update: {
          account_type?: string
          activated_at?: string
          address?: string | null
          business_type?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          created_by_admin?: boolean
          dob?: string | null
          email?: string
          full_name?: string
          gender?: string | null
          id?: string
          mobile?: string | null
          pincode?: string | null
          reminder_sent_at?: string | null
          state?: string | null
          status?: string
          updated_at?: string
          verification_due_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          admin_note: string | null
          amenities: string[]
          area_sqft: number | null
          baths: number | null
          beds: number | null
          category_id: string | null
          cover_url: string | null
          created_at: string
          description: string | null
          documents: string[]
          featured: boolean
          gallery: string[]
          id: string
          image: string
          location: string
          price: number
          property_type: string
          ref: string
          seller_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amenities?: string[]
          area_sqft?: number | null
          baths?: number | null
          beds?: number | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          documents?: string[]
          featured?: boolean
          gallery?: string[]
          id?: string
          image?: string
          location: string
          price?: number
          property_type?: string
          ref?: string
          seller_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amenities?: string[]
          area_sqft?: number | null
          baths?: number | null
          beds?: number | null
          category_id?: string | null
          cover_url?: string | null
          created_at?: string
          description?: string | null
          documents?: string[]
          featured?: boolean
          gallery?: string[]
          id?: string
          image?: string
          location?: string
          price?: number
          property_type?: string
          ref?: string
          seller_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "properties_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          admin_reply: string | null
          created_at: string
          id: string
          message: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          created_at?: string
          id?: string
          message?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          method: string
          payer_email: string | null
          payer_name: string | null
          purpose: string
          reference: string
          status: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          method?: string
          payer_email?: string | null
          payer_name?: string | null
          purpose?: string
          reference?: string
          status?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          method?: string
          payer_email?: string | null
          payer_name?: string | null
          purpose?: string
          reference?: string
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_exists: { Args: never; Returns: boolean }
      claim_first_admin: { Args: never; Returns: boolean }
      enforce_verification_deadlines: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_account_active: { Args: { _uid: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "buyer" | "seller"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "buyer", "seller"],
    },
  },
} as const
