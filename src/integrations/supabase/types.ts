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
      comment_reports: {
        Row: {
          actor_key: string
          comment_id: string
          created_at: string
          guest_session_id: string | null
          id: string
          reason: string
          user_id: string | null
        }
        Insert: {
          actor_key: string
          comment_id: string
          created_at?: string
          guest_session_id?: string | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Update: {
          actor_key?: string
          comment_id?: string
          created_at?: string
          guest_session_id?: string | null
          id?: string
          reason?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comment_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "content_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_reports_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_comments: {
        Row: {
          actor_key: string
          body: string
          created_at: string
          display_name: string
          guest_session_id: string | null
          id: string
          publication_id: string
          publication_type: Database["public"]["Enums"]["publication_type"]
          status: Database["public"]["Enums"]["comment_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          actor_key: string
          body: string
          created_at?: string
          display_name: string
          guest_session_id?: string | null
          id?: string
          publication_id: string
          publication_type: Database["public"]["Enums"]["publication_type"]
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          actor_key?: string
          body?: string
          created_at?: string
          display_name?: string
          guest_session_id?: string | null
          id?: string
          publication_id?: string
          publication_type?: Database["public"]["Enums"]["publication_type"]
          status?: Database["public"]["Enums"]["comment_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_comments_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      content_likes: {
        Row: {
          actor_key: string
          created_at: string
          guest_session_id: string | null
          id: string
          publication_id: string
          publication_type: Database["public"]["Enums"]["publication_type"]
          user_id: string | null
        }
        Insert: {
          actor_key: string
          created_at?: string
          guest_session_id?: string | null
          id?: string
          publication_id: string
          publication_type: Database["public"]["Enums"]["publication_type"]
          user_id?: string | null
        }
        Update: {
          actor_key?: string
          created_at?: string
          guest_session_id?: string | null
          id?: string
          publication_id?: string
          publication_type?: Database["public"]["Enums"]["publication_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_likes_guest_session_id_fkey"
            columns: ["guest_session_id"]
            isOneToOne: false
            referencedRelation: "guest_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          event_date: string
          event_time: string | null
          id: string
          location: string | null
          moderation_status: Database["public"]["Enums"]["event_status"]
          organization_id: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          submitted_at: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date: string
          event_time?: string | null
          id?: string
          location?: string | null
          moderation_status?: Database["public"]["Enums"]["event_status"]
          organization_id: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          title: string
          unpublished_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_date?: string
          event_time?: string | null
          id?: string
          location?: string | null
          moderation_status?: Database["public"]["Enums"]["event_status"]
          organization_id?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          submitted_at?: string | null
          title?: string
          unpublished_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      guest_sessions: {
        Row: {
          created_at: string
          id: string
          last_seen_at: string
          token_hash: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_seen_at?: string
          token_hash: string
        }
        Update: {
          created_at?: string
          id?: string
          last_seen_at?: string
          token_hash?: string
        }
        Relationships: []
      }
      media_items: {
        Row: {
          created_at: string
          description: string | null
          event_id: string | null
          file_size: number
          id: string
          media_kind: Database["public"]["Enums"]["media_kind"]
          mime_type: string
          organization_id: string
          plan_item_id: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["media_status"]
          storage_path: string
          thumbnail_path: string | null
          title: string
          unpublished_at: string | null
          updated_at: string
          uploader_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          file_size: number
          id?: string
          media_kind: Database["public"]["Enums"]["media_kind"]
          mime_type: string
          organization_id: string
          plan_item_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["media_status"]
          storage_path: string
          thumbnail_path?: string | null
          title: string
          unpublished_at?: string | null
          updated_at?: string
          uploader_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          event_id?: string | null
          file_size?: number
          id?: string
          media_kind?: Database["public"]["Enums"]["media_kind"]
          mime_type?: string
          organization_id?: string
          plan_item_id?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["media_status"]
          storage_path?: string
          thumbnail_path?: string | null
          title?: string
          unpublished_at?: string | null
          updated_at?: string
          uploader_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_items_plan_item_id_fkey"
            columns: ["plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json
          notification_type: string
          organization_id: string | null
          recipient_role: Database["public"]["Enums"]["app_role"] | null
          recipient_user_id: string | null
          related_event_id: string | null
          related_media_id: string | null
          related_plan_item_id: string | null
          title: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json
          notification_type: string
          organization_id?: string | null
          recipient_role?: Database["public"]["Enums"]["app_role"] | null
          recipient_user_id?: string | null
          related_event_id?: string | null
          related_media_id?: string | null
          related_plan_item_id?: string | null
          title: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json
          notification_type?: string
          organization_id?: string | null
          recipient_role?: Database["public"]["Enums"]["app_role"] | null
          recipient_user_id?: string | null
          related_event_id?: string | null
          related_media_id?: string | null
          related_plan_item_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_event_id_fkey"
            columns: ["related_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_media_id_fkey"
            columns: ["related_media_id"]
            isOneToOne: false
            referencedRelation: "media_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_related_plan_item_id_fkey"
            columns: ["related_plan_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          avatar_path: string | null
          cover_path: string | null
          created_at: string
          description: string | null
          director_name: string | null
          email: string | null
          id: string
          is_demo: boolean
          locality: string | null
          logo_url: string | null
          name: string
          organization_type:
            | Database["public"]["Enums"]["organization_type"]
            | null
          phone: string | null
          region_id: string | null
          settlement: string | null
          source_url: string | null
          staff_count: number | null
          status: Database["public"]["Enums"]["organization_status"]
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          address?: string | null
          avatar_path?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          director_name?: string | null
          email?: string | null
          id?: string
          is_demo?: boolean
          locality?: string | null
          logo_url?: string | null
          name: string
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          phone?: string | null
          region_id?: string | null
          settlement?: string | null
          source_url?: string | null
          staff_count?: number | null
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          address?: string | null
          avatar_path?: string | null
          cover_path?: string | null
          created_at?: string
          description?: string | null
          director_name?: string | null
          email?: string | null
          id?: string
          is_demo?: boolean
          locality?: string | null
          logo_url?: string | null
          name?: string
          organization_type?:
            | Database["public"]["Enums"]["organization_type"]
            | null
          phone?: string | null
          region_id?: string | null
          settlement?: string | null
          source_url?: string | null
          staff_count?: number | null
          status?: Database["public"]["Enums"]["organization_status"]
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizations_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          completed_on: string | null
          completion_report: string | null
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          is_demo: boolean
          material_status: Database["public"]["Enums"]["plan_material_status"]
          notes: string | null
          organization_id: string
          plan_id: string | null
          planned_date: string
          requires_media: boolean
          responsible: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source_item_id: string | null
          status: Database["public"]["Enums"]["plan_item_status"]
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_on?: string | null
          completion_report?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          is_demo?: boolean
          material_status?: Database["public"]["Enums"]["plan_material_status"]
          notes?: string | null
          organization_id: string
          plan_id?: string | null
          planned_date: string
          requires_media?: boolean
          responsible?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_item_id?: string | null
          status?: Database["public"]["Enums"]["plan_item_status"]
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          completed_on?: string | null
          completion_report?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          is_demo?: boolean
          material_status?: Database["public"]["Enums"]["plan_material_status"]
          notes?: string | null
          organization_id?: string
          plan_id?: string | null
          planned_date?: string
          requires_media?: boolean
          responsible?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source_item_id?: string | null
          status?: Database["public"]["Enums"]["plan_item_status"]
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_items_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_items_source_item_id_fkey"
            columns: ["source_item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_tracking_settings: {
        Row: {
          grace_days: number
          id: boolean
          updated_at: string
        }
        Insert: {
          grace_days?: number
          id?: boolean
          updated_at?: string
        }
        Update: {
          grace_days?: number
          id?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      plans: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          file_mime_type: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          organization_id: string
          period_month: number | null
          period_year: number
          plan_type: Database["public"]["Enums"]["plan_type"]
          title: string
          updated_at: string
          uploaded_at: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_mime_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          organization_id: string
          period_month?: number | null
          period_year: number
          plan_type?: Database["public"]["Enums"]["plan_type"]
          title: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_mime_type?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          organization_id?: string
          period_month?: number | null
          period_year?: number
          plan_type?: Database["public"]["Enums"]["plan_type"]
          title?: string
          updated_at?: string
          uploaded_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      regions: {
        Row: {
          created_at: string
          id: string
          image_path: string | null
          kind: Database["public"]["Enums"]["region_kind"]
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_path?: string | null
          kind: Database["public"]["Enums"]["region_kind"]
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_path?: string | null
          kind?: Database["public"]["Enums"]["region_kind"]
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
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
      add_publication_comment: {
        Args: {
          _actor_key: string
          _body: string
          _display_name: string
          _guest_session_id: string
          _id: string
          _type: Database["public"]["Enums"]["publication_type"]
          _user_id: string
        }
        Returns: string
      }
      cancel_plan_item: {
        Args: { _item_id: string; _reason: string }
        Returns: undefined
      }
      compute_plan_material_status: {
        Args: {
          _event_id: string
          _item_id: string
          _planned: string
          _requires: boolean
        }
        Returns: Database["public"]["Enums"]["plan_material_status"]
      }
      current_organization_id: { Args: never; Returns: string }
      event_is_editable: { Args: { _event_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: { Args: never; Returns: boolean }
      moderate_event: {
        Args: {
          _event_id: string
          _reason?: string
          _status: Database["public"]["Enums"]["event_status"]
        }
        Returns: undefined
      }
      moderate_publication_comment: {
        Args: {
          _comment_id: string
          _status: Database["public"]["Enums"]["comment_status"]
        }
        Returns: undefined
      }
      publication_is_public: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["publication_type"]
        }
        Returns: boolean
      }
      refresh_plan_items_for: {
        Args: { _event_id: string; _plan_item_id: string }
        Returns: undefined
      }
      reopen_plan_item: { Args: { _item_id: string }; Returns: undefined }
      report_publication_comment: {
        Args: {
          _actor_key: string
          _comment_id: string
          _guest_session_id: string
          _reason: string
          _user_id: string
        }
        Returns: undefined
      }
      review_plan_item_completion: {
        Args: { _approved: boolean; _item_id: string; _reason?: string }
        Returns: undefined
      }
      run_plan_material_check: { Args: never; Returns: number }
      submit_event_for_moderation: {
        Args: { _event_id: string }
        Returns: undefined
      }
      submit_plan_item_completion: {
        Args: { _completed_on: string; _item_id: string; _report: string }
        Returns: undefined
      }
      toggle_publication_like: {
        Args: {
          _actor_key: string
          _guest_session_id: string
          _id: string
          _type: Database["public"]["Enums"]["publication_type"]
          _user_id: string
        }
        Returns: boolean
      }
      unpublish_publication: {
        Args: {
          _id: string
          _type: Database["public"]["Enums"]["publication_type"]
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "PUBLIC_USER"
      comment_status: "approved" | "rejected"
      event_status: "draft" | "pending" | "approved" | "rejected"
      media_kind: "photo" | "video"
      media_status: "pending" | "approved" | "rejected"
      organization_status: "active" | "inactive"
      organization_type:
        | "district_center"
        | "house_of_culture"
        | "rural_house"
        | "club"
        | "leisure_center"
      plan_item_status:
        | "planned"
        | "completion_submitted"
        | "completed"
        | "cancelled"
        | "completion_returned"
      plan_material_status:
        | "planned"
        | "upcoming"
        | "waiting_for_material"
        | "material_submitted"
        | "under_moderation"
        | "approved"
        | "returned_for_revision"
        | "overdue_no_material"
      plan_type: "annual" | "monthly"
      publication_type: "event" | "media_item"
      region_kind: "city" | "district"
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
      app_role: ["SUPER_ADMIN", "ORGANIZATION_ADMIN", "PUBLIC_USER"],
      comment_status: ["approved", "rejected"],
      event_status: ["draft", "pending", "approved", "rejected"],
      media_kind: ["photo", "video"],
      media_status: ["pending", "approved", "rejected"],
      organization_status: ["active", "inactive"],
      organization_type: [
        "district_center",
        "house_of_culture",
        "rural_house",
        "club",
        "leisure_center",
      ],
      plan_item_status: [
        "planned",
        "completion_submitted",
        "completed",
        "cancelled",
        "completion_returned",
      ],
      plan_material_status: [
        "planned",
        "upcoming",
        "waiting_for_material",
        "material_submitted",
        "under_moderation",
        "approved",
        "returned_for_revision",
        "overdue_no_material",
      ],
      plan_type: ["annual", "monthly"],
      publication_type: ["event", "media_item"],
      region_kind: ["city", "district"],
    },
  },
} as const
