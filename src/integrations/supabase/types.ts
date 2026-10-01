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
      countries: {
        Row: {
          active: boolean
          code: string
          created_at: string
          currency: string
          inr_rate: number | null
          name: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          currency: string
          inr_rate?: number | null
          name: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          currency?: string
          inr_rate?: number | null
          name?: string
        }
        Relationships: []
      }
      gateway_secrets: {
        Row: {
          id: number
          key_secret: string | null
          msg91_auth_key: string | null
          smtp_password: string | null
          updated_at: string
          webhook_secret: string | null
          whatsapp_access_token: string | null
          whatsapp_verify_token: string | null
          whatsapp_webhook_secret: string | null
        }
        Insert: {
          id?: number
          key_secret?: string | null
          msg91_auth_key?: string | null
          smtp_password?: string | null
          updated_at?: string
          webhook_secret?: string | null
          whatsapp_access_token?: string | null
          whatsapp_verify_token?: string | null
          whatsapp_webhook_secret?: string | null
        }
        Update: {
          id?: number
          key_secret?: string | null
          msg91_auth_key?: string | null
          smtp_password?: string | null
          updated_at?: string
          webhook_secret?: string | null
          whatsapp_access_token?: string | null
          whatsapp_verify_token?: string | null
          whatsapp_webhook_secret?: string | null
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
      kyc_documents: {
        Row: {
          created_at: string
          doc_type: string
          file_name: string
          file_path: string
          id: string
          mime_type: string
          size_bytes: number
          submission_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          doc_type: string
          file_name: string
          file_path: string
          id?: string
          mime_type: string
          size_bytes: number
          submission_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          doc_type?: string
          file_name?: string
          file_path?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          submission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "kyc_submissions"
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
          required_fields: string[]
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
          required_fields?: string[]
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
          required_fields?: string[]
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
      otp_verifications: {
        Row: {
          attempts: number
          created_at: string
          expires_at: string
          id: string
          mobile: string
          otp_hash: string
          status: string
          verified_at: string | null
          verify_token_hash: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          expires_at: string
          id?: string
          mobile: string
          otp_hash: string
          status?: string
          verified_at?: string | null
          verify_token_hash?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          expires_at?: string
          id?: string
          mobile?: string
          otp_hash?: string
          status?: string
          verified_at?: string | null
          verify_token_hash?: string | null
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
          payment_mode: string
          provider: string
          updated_at: string
        }
        Insert: {
          activation_fee?: number
          enabled?: boolean
          id?: number
          key_id?: string | null
          mode?: string
          payment_mode?: string
          provider?: string
          updated_at?: string
        }
        Update: {
          activation_fee?: number
          enabled?: boolean
          id?: number
          key_id?: string | null
          mode?: string
          payment_mode?: string
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          currency: string
          id: number
          maintenance_mode: boolean
          manual_payment_enabled: boolean
          max_upload_mb: number
          msg91_enabled: boolean
          msg91_sender_id: string | null
          msg91_template_id: string | null
          notification_matrix: Json
          notify_email: boolean
          notify_sms: boolean
          notify_whatsapp: boolean
          otp_expiry_minutes: number
          otp_max_attempts: number
          otp_provider: string
          otp_resend_seconds: number
          platform_email: string | null
          platform_name: string
          platform_status: string
          reminder_days_before: number
          session_timeout_minutes: number
          smtp_enabled: boolean
          smtp_from: string | null
          smtp_from_name: string | null
          smtp_host: string | null
          smtp_port: number | null
          smtp_security: string
          smtp_username: string | null
          updated_at: string
          verification_days: number
          whatsapp_api_url: string | null
          whatsapp_business_account_id: string | null
          whatsapp_enabled: boolean
          whatsapp_phone_number_id: string | null
          whatsapp_provider: string | null
          whatsapp_webhook_url: string | null
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          id?: number
          maintenance_mode?: boolean
          manual_payment_enabled?: boolean
          max_upload_mb?: number
          msg91_enabled?: boolean
          msg91_sender_id?: string | null
          msg91_template_id?: string | null
          notification_matrix?: Json
          notify_email?: boolean
          notify_sms?: boolean
          notify_whatsapp?: boolean
          otp_expiry_minutes?: number
          otp_max_attempts?: number
          otp_provider?: string
          otp_resend_seconds?: number
          platform_email?: string | null
          platform_name?: string
          platform_status?: string
          reminder_days_before?: number
          session_timeout_minutes?: number
          smtp_enabled?: boolean
          smtp_from?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_security?: string
          smtp_username?: string | null
          updated_at?: string
          verification_days?: number
          whatsapp_api_url?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_enabled?: boolean
          whatsapp_phone_number_id?: string | null
          whatsapp_provider?: string | null
          whatsapp_webhook_url?: string | null
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          currency?: string
          id?: number
          maintenance_mode?: boolean
          manual_payment_enabled?: boolean
          max_upload_mb?: number
          msg91_enabled?: boolean
          msg91_sender_id?: string | null
          msg91_template_id?: string | null
          notification_matrix?: Json
          notify_email?: boolean
          notify_sms?: boolean
          notify_whatsapp?: boolean
          otp_expiry_minutes?: number
          otp_max_attempts?: number
          otp_provider?: string
          otp_resend_seconds?: number
          platform_email?: string | null
          platform_name?: string
          platform_status?: string
          reminder_days_before?: number
          session_timeout_minutes?: number
          smtp_enabled?: boolean
          smtp_from?: string | null
          smtp_from_name?: string | null
          smtp_host?: string | null
          smtp_port?: number | null
          smtp_security?: string
          smtp_username?: string | null
          updated_at?: string
          verification_days?: number
          whatsapp_api_url?: string | null
          whatsapp_business_account_id?: string | null
          whatsapp_enabled?: boolean
          whatsapp_phone_number_id?: string | null
          whatsapp_provider?: string | null
          whatsapp_webhook_url?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_type: string
          activated_at: string
          address: string | null
          budget_currency: string | null
          budget_max: number | null
          budget_min: number | null
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
          market_preference: string | null
          mobile: string | null
          mobile_verified: boolean
          pincode: string | null
          preferred_asset_types: string[]
          preferred_countries: string[]
          preferred_regions: string | null
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
          budget_currency?: string | null
          budget_max?: number | null
          budget_min?: number | null
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
          market_preference?: string | null
          mobile?: string | null
          mobile_verified?: boolean
          pincode?: string | null
          preferred_asset_types?: string[]
          preferred_countries?: string[]
          preferred_regions?: string | null
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
          budget_currency?: string | null
          budget_max?: number | null
          budget_min?: number | null
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
          market_preference?: string | null
          mobile?: string | null
          mobile_verified?: boolean
          pincode?: string | null
          preferred_asset_types?: string[]
          preferred_countries?: string[]
          preferred_regions?: string | null
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
          asset_category: string | null
          baths: number | null
          beds: number | null
          category_id: string | null
          city: string | null
          country: string
          country_code: string
          cover_url: string | null
          created_at: string
          currency: string
          description: string | null
          documents: string[]
          featured: boolean
          gallery: string[]
          id: string
          image: string
          locality: string | null
          location: string
          market: string
          postal_code: string | null
          price: number
          price_in_inr: number | null
          property_type: string
          ref: string
          region: string | null
          seller_id: string | null
          status: string
          time_zone: string | null
          title: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          amenities?: string[]
          area_sqft?: number | null
          asset_category?: string | null
          baths?: number | null
          beds?: number | null
          category_id?: string | null
          city?: string | null
          country?: string
          country_code?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          documents?: string[]
          featured?: boolean
          gallery?: string[]
          id?: string
          image?: string
          locality?: string | null
          location: string
          market?: string
          postal_code?: string | null
          price?: number
          price_in_inr?: number | null
          property_type?: string
          ref?: string
          region?: string | null
          seller_id?: string | null
          status?: string
          time_zone?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          amenities?: string[]
          area_sqft?: number | null
          asset_category?: string | null
          baths?: number | null
          beds?: number | null
          category_id?: string | null
          city?: string | null
          country?: string
          country_code?: string
          cover_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          documents?: string[]
          featured?: boolean
          gallery?: string[]
          id?: string
          image?: string
          locality?: string | null
          location?: string
          market?: string
          postal_code?: string | null
          price?: number
          price_in_inr?: number | null
          property_type?: string
          ref?: string
          region?: string | null
          seller_id?: string | null
          status?: string
          time_zone?: string | null
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
      saved_properties: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_members: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          permissions: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          permissions?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          permissions?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          account_role: string | null
          amount: number
          created_at: string
          currency: string
          environment: string | null
          failure_reason: string | null
          id: string
          method: string
          notes: string | null
          order_id: string | null
          payer_email: string | null
          payer_name: string | null
          payment_date: string | null
          payment_id: string | null
          provider: string | null
          purpose: string
          receipt_path: string | null
          recorded_by: string | null
          reference: string
          status: string
          updated_at: string
          user_id: string | null
          verified_at: string | null
          verified_by: string | null
          verified_via: string | null
        }
        Insert: {
          account_role?: string | null
          amount: number
          created_at?: string
          currency?: string
          environment?: string | null
          failure_reason?: string | null
          id?: string
          method?: string
          notes?: string | null
          order_id?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payment_date?: string | null
          payment_id?: string | null
          provider?: string | null
          purpose?: string
          receipt_path?: string | null
          recorded_by?: string | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_via?: string | null
        }
        Update: {
          account_role?: string | null
          amount?: number
          created_at?: string
          currency?: string
          environment?: string | null
          failure_reason?: string | null
          id?: string
          method?: string
          notes?: string | null
          order_id?: string | null
          payer_email?: string | null
          payer_name?: string | null
          payment_date?: string | null
          payment_id?: string | null
          provider?: string | null
          purpose?: string
          receipt_path?: string | null
          recorded_by?: string | null
          reference?: string
          status?: string
          updated_at?: string
          user_id?: string | null
          verified_at?: string | null
          verified_by?: string | null
          verified_via?: string | null
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
      webhook_endpoints: {
        Row: {
          active: boolean
          endpoint: string
          events: string[]
          id: string
          last_error: string | null
          last_error_at: string | null
          last_event_at: string | null
          last_success_at: string | null
          provider: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          endpoint: string
          events?: string[]
          id: string
          last_error?: string | null
          last_error_at?: string | null
          last_event_at?: string | null
          last_success_at?: string | null
          provider: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          endpoint?: string
          events?: string[]
          id?: string
          last_error?: string | null
          last_error_at?: string | null
          last_event_at?: string | null
          last_success_at?: string | null
          provider?: string
          updated_at?: string
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          payload: Json
          received_at: string
          source: string | null
          status: string
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          payload?: Json
          received_at?: string
          source?: string | null
          status?: string
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          payload?: Json
          received_at?: string
          source?: string | null
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      account_state: {
        Args: {
          _due: string
          _last_payment: string
          _status: string
          _verification: string
        }
        Returns: string
      }
      admin_exists: { Args: never; Returns: boolean }
      admin_list_members: {
        Args: never
        Returns: {
          id: string
          last_sign_in_at: string
          lifecycle: string
          payment_status: string
        }[]
      }
      claim_first_admin: { Args: never; Returns: boolean }
      enforce_verification_deadlines: { Args: never; Returns: number }
      has_permission: {
        Args: { _perm: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
