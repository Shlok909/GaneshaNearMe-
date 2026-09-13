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
      pandal_submissions: {
        Row: {
          area: string
          category: string | null
          contact_phone: string
          created_at: string
          description: string | null
          ganapati_image_paths: string[]
          id: string
          latitude: number
          location: unknown
          location_text: string
          longitude: number
          mandal_name: string
          pandal_image_paths: string[]
          possible_duplicate: boolean
          public_access: boolean
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          submitted_by: string
          submitter_name: string
          submitter_role: string | null
          theme: string | null
          updated_at: string
          verification_score: number
        }
        Insert: {
          area?: string
          category?: string | null
          contact_phone?: string
          created_at?: string
          description?: string | null
          ganapati_image_paths?: string[]
          id?: string
          latitude: number
          location?: unknown
          location_text?: string
          longitude: number
          mandal_name: string
          pandal_image_paths?: string[]
          possible_duplicate?: boolean
          public_access?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string
          submitter_name?: string
          submitter_role?: string | null
          theme?: string | null
          updated_at?: string
          verification_score?: number
        }
        Update: {
          area?: string
          category?: string | null
          contact_phone?: string
          created_at?: string
          description?: string | null
          ganapati_image_paths?: string[]
          id?: string
          latitude?: number
          location?: unknown
          location_text?: string
          longitude?: number
          mandal_name?: string
          pandal_image_paths?: string[]
          possible_duplicate?: boolean
          public_access?: boolean
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by?: string
          submitter_name?: string
          submitter_role?: string | null
          theme?: string | null
          updated_at?: string
          verification_score?: number
        }
        Relationships: []
      }
      pandals: {
        Row: {
          area: string
          category: string
          created_at: string
          description: string | null
          ganapati_image_paths: string[]
          id: string
          latitude: number
          location: unknown
          longitude: number
          mandal_name: string
          pandal_image_paths: string[]
          source_submission_id: string
          theme: string | null
          updated_at: string
        }
        Insert: {
          area: string
          category: string
          created_at?: string
          description?: string | null
          ganapati_image_paths: string[]
          id: string
          latitude: number
          location?: unknown
          longitude: number
          mandal_name: string
          pandal_image_paths: string[]
          source_submission_id: string
          theme?: string | null
          updated_at?: string
        }
        Update: {
          area?: string
          category?: string
          created_at?: string
          description?: string | null
          ganapati_image_paths?: string[]
          id?: string
          latitude?: number
          location?: unknown
          longitude?: number
          mandal_name?: string
          pandal_image_paths?: string[]
          source_submission_id?: string
          theme?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pandals_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "pandal_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pandals_source_submission_id_fkey"
            columns: ["source_submission_id"]
            isOneToOne: true
            referencedRelation: "pandal_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      saved_pandals: {
        Row: {
          created_at: string
          pandal_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pandal_id: string
          user_id?: string
        }
        Update: {
          created_at?: string
          pandal_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_pandals_pandal_id_fkey"
            columns: ["pandal_id"]
            isOneToOne: false
            referencedRelation: "pandals"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_admin: { Args: never; Returns: boolean }
      consume_route_request: { Args: never; Returns: number }
      finalize_pandal_submission: {
        Args: { p_submission_id: string }
        Returns: {
          published: boolean
          submission_id: string
          submission_status: string
        }[]
      }
      nearby_pandals: {
        Args: { p_latitude: number; p_longitude: number; p_radius_km: number }
        Returns: {
          area: string
          category: string
          created_at: string
          description: string
          distance_meters: number
          ganapati_image_paths: string[]
          id: string
          latitude: number
          longitude: number
          mandal_name: string
          pandal_image_paths: string[]
          source_submission_id: string
          theme: string
          updated_at: string
        }[]
      }
      review_pandal_submission: {
        Args: { p_decision: string; p_notes?: string; p_submission_id: string }
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
    Enums: {},
  },
} as const
