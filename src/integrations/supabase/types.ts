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
          created_at: string
          details: Json | null
          entity: string | null
          entity_id: string | null
          id: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity?: string | null
          entity_id?: string | null
          id?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bestsellers: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          min_qty: number
          name: string
          rank: number
          unit_price: number | null
          units_sold: number
          wholesale_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          min_qty?: number
          name: string
          rank: number
          unit_price?: number | null
          units_sold?: number
          wholesale_price: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          min_qty?: number
          name?: string
          rank?: number
          unit_price?: number | null
          units_sold?: number
          wholesale_price?: number
        }
        Relationships: []
      }
      commission_tiers: {
        Row: {
          commission_pct: number
          created_at: string
          id: string
          label: string
          max_order: number | null
          min_order: number
          perks: string | null
          sort_order: number
        }
        Insert: {
          commission_pct: number
          created_at?: string
          id?: string
          label: string
          max_order?: number | null
          min_order: number
          perks?: string | null
          sort_order?: number
        }
        Update: {
          commission_pct?: number
          created_at?: string
          id?: string
          label?: string
          max_order?: number | null
          min_order?: number
          perks?: string | null
          sort_order?: number
        }
        Relationships: []
      }
      orders: {
        Row: {
          address_city: string
          address_complement: string | null
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          carrier: string | null
          created_at: string
          customer_cnpj: string | null
          customer_cpf: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_status: string
          dispatched_at: string | null
          driver_name: string | null
          due_at: string
          expedition_notes: string | null
          expedition_status: string
          expires_at: string | null
          id: string
          items: Json
          loaded_at: string | null
          order_code: string
          payment_checked_at: string | null
          payment_details: Json | null
          payment_method: string
          payment_nsu: string | null
          payment_provider: string | null
          payment_status: string
          total_amount: number
          tracking_code: string
          user_id: string | null
          vehicle_plate: string | null
        }
        Insert: {
          address_city: string
          address_complement?: string | null
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          carrier?: string | null
          created_at?: string
          customer_cnpj?: string | null
          customer_cpf?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at?: string | null
          delivery_status?: string
          dispatched_at?: string | null
          driver_name?: string | null
          due_at?: string
          expedition_notes?: string | null
          expedition_status?: string
          expires_at?: string | null
          id?: string
          items: Json
          loaded_at?: string | null
          order_code: string
          payment_checked_at?: string | null
          payment_details?: Json | null
          payment_method: string
          payment_nsu?: string | null
          payment_provider?: string | null
          payment_status?: string
          total_amount: number
          tracking_code: string
          user_id?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          address_city?: string
          address_complement?: string | null
          address_number?: string
          address_state?: string
          address_street?: string
          address_zip?: string
          carrier?: string | null
          created_at?: string
          customer_cnpj?: string | null
          customer_cpf?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivered_at?: string | null
          delivery_status?: string
          dispatched_at?: string | null
          driver_name?: string | null
          due_at?: string
          expedition_notes?: string | null
          expedition_status?: string
          expires_at?: string | null
          id?: string
          items?: Json
          loaded_at?: string | null
          order_code?: string
          payment_checked_at?: string | null
          payment_details?: Json | null
          payment_method?: string
          payment_nsu?: string | null
          payment_provider?: string | null
          payment_status?: string
          total_amount?: number
          tracking_code?: string
          user_id?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          badge: string | null
          badge_color: string | null
          catalog_order: number
          category: string
          created_at: string
          id: string
          image_url: string | null
          in_catalog: boolean
          min_qty: number
          name: string
          sort_order: number
          stock: number
          unit_price: number
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          active?: boolean
          badge?: string | null
          badge_color?: string | null
          catalog_order?: number
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          in_catalog?: boolean
          min_qty?: number
          name: string
          sort_order?: number
          stock?: number
          unit_price: number
          updated_at?: string
          wholesale_price: number
        }
        Update: {
          active?: boolean
          badge?: string | null
          badge_color?: string | null
          catalog_order?: number
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          in_catalog?: boolean
          min_qty?: number
          name?: string
          sort_order?: number
          stock?: number
          unit_price?: number
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          cnpj: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_code: string
          user_id: string
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_code?: string
          user_id: string
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          cnpj?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_code?: string
          user_id?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          city: string
          comment: string
          created_at: string
          id: string
          product_name: string | null
          rating: number
          reseller_name: string
        }
        Insert: {
          city: string
          comment: string
          created_at?: string
          id?: string
          product_name?: string | null
          rating: number
          reseller_name: string
        }
        Update: {
          city?: string
          comment?: string
          created_at?: string
          id?: string
          product_name?: string | null
          rating?: number
          reseller_name?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          order_code: string | null
          order_id: string | null
          product_id: string | null
          product_name: string
          qty: number
          reason: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_code?: string | null
          order_id?: string | null
          product_id?: string | null
          product_name: string
          qty: number
          reason?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          order_code?: string | null
          order_id?: string | null
          product_id?: string | null
          product_name?: string
          qty?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      videos: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          sort_order: number
          source: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string | null
          youtube_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          source?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url?: string | null
          youtube_id?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          sort_order?: number
          source?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string | null
          youtube_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      expire_overdue_orders: { Args: never; Returns: number }
      get_order_by_code: {
        Args: { _order_code: string }
        Returns: {
          address_city: string
          address_complement: string | null
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          carrier: string | null
          created_at: string
          customer_cnpj: string | null
          customer_cpf: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivered_at: string | null
          delivery_status: string
          dispatched_at: string | null
          driver_name: string | null
          due_at: string
          expedition_notes: string | null
          expedition_status: string
          expires_at: string | null
          id: string
          items: Json
          loaded_at: string | null
          order_code: string
          payment_checked_at: string | null
          payment_details: Json | null
          payment_method: string
          payment_nsu: string | null
          payment_provider: string | null
          payment_status: string
          total_amount: number
          tracking_code: string
          user_id: string | null
          vehicle_plate: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "orders"
          isOneToOne: false
          isSetofReturn: true
        }
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
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
