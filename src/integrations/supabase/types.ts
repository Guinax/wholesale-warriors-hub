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
          created_at: string
          customer_cnpj: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_status: string
          id: string
          items: Json
          order_code: string
          payment_method: string
          payment_status: string
          total_amount: number
          tracking_code: string
        }
        Insert: {
          address_city: string
          address_complement?: string | null
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          created_at?: string
          customer_cnpj?: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_status?: string
          id?: string
          items: Json
          order_code: string
          payment_method: string
          payment_status?: string
          total_amount: number
          tracking_code: string
        }
        Update: {
          address_city?: string
          address_complement?: string | null
          address_number?: string
          address_state?: string
          address_street?: string
          address_zip?: string
          created_at?: string
          customer_cnpj?: string | null
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          delivery_status?: string
          id?: string
          items?: Json
          order_code?: string
          payment_method?: string
          payment_status?: string
          total_amount?: number
          tracking_code?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          badge: string | null
          badge_color: string | null
          category: string
          created_at: string
          id: string
          image_url: string | null
          min_qty: number
          name: string
          sort_order: number
          unit_price: number
          updated_at: string
          wholesale_price: number
        }
        Insert: {
          active?: boolean
          badge?: string | null
          badge_color?: string | null
          category: string
          created_at?: string
          id?: string
          image_url?: string | null
          min_qty?: number
          name: string
          sort_order?: number
          unit_price: number
          updated_at?: string
          wholesale_price: number
        }
        Update: {
          active?: boolean
          badge?: string | null
          badge_color?: string | null
          category?: string
          created_at?: string
          id?: string
          image_url?: string | null
          min_qty?: number
          name?: string
          sort_order?: number
          unit_price?: number
          updated_at?: string
          wholesale_price?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
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
      get_order_by_code: {
        Args: { _order_code: string }
        Returns: {
          address_city: string
          address_complement: string | null
          address_number: string
          address_state: string
          address_street: string
          address_zip: string
          created_at: string
          customer_cnpj: string | null
          customer_email: string
          customer_name: string
          customer_phone: string
          delivery_status: string
          id: string
          items: Json
          order_code: string
          payment_method: string
          payment_status: string
          total_amount: number
          tracking_code: string
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
