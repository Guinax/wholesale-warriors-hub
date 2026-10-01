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
      admin_campaigns: {
        Row: {
          body: string
          created_at: string
          created_by: string
          cta: string
          destination_url: string
          headline: string
          id: string
          media_urls: string[]
          name: string
          platforms: string[]
          product_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          created_by: string
          cta?: string
          destination_url?: string
          headline?: string
          id?: string
          media_urls?: string[]
          name: string
          platforms?: string[]
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          created_by?: string
          cta?: string
          destination_url?: string
          headline?: string
          id?: string
          media_urls?: string[]
          name?: string
          platforms?: string[]
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
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
          wholesale_price?: number
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
      catalog_settings: {
        Row: {
          id: number
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          id?: number
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          id?: number
          subtitle?: string
          title?: string
          updated_at?: string
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
      inventory_balances: {
        Row: {
          id: string
          product_id: string
          quantity: number
          reorder_point: number
          reserved: number
          source_id: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          reorder_point?: number
          reserved?: number
          source_id: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          reorder_point?: number
          reserved?: number
          source_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_balances_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_balances_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "inventory_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_sources: {
        Row: {
          active: boolean
          address_number: string | null
          address_street: string | null
          address_zip: string | null
          city: string | null
          contact_name: string | null
          created_at: string
          id: string
          latitude: number | null
          local_delivery_enabled: boolean
          local_delivery_eta_minutes: number | null
          local_delivery_fee: number
          longitude: number | null
          name: string
          own_driver_enabled: boolean
          phone: string | null
          service_radius_km: number | null
          source_type: string
          state: string | null
          third_party_driver_enabled: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          address_number?: string | null
          address_street?: string | null
          address_zip?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          local_delivery_enabled?: boolean
          local_delivery_eta_minutes?: number | null
          local_delivery_fee?: number
          longitude?: number | null
          name: string
          own_driver_enabled?: boolean
          phone?: string | null
          service_radius_km?: number | null
          source_type: string
          state?: string | null
          third_party_driver_enabled?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          address_number?: string | null
          address_street?: string | null
          address_zip?: string | null
          city?: string | null
          contact_name?: string | null
          created_at?: string
          id?: string
          latitude?: number | null
          local_delivery_enabled?: boolean
          local_delivery_eta_minutes?: number | null
          local_delivery_fee?: number
          longitude?: number | null
          name?: string
          own_driver_enabled?: boolean
          phone?: string | null
          service_radius_km?: number | null
          source_type?: string
          state?: string | null
          third_party_driver_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      order_inventory_reservations: {
        Row: {
          balance_id: string
          consumed_at: string | null
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          released_at: string | null
        }
        Insert: {
          balance_id: string
          consumed_at?: string | null
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          released_at?: string | null
        }
        Update: {
          balance_id?: string
          consumed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          released_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_inventory_reservations_balance_id_fkey"
            columns: ["balance_id"]
            isOneToOne: false
            referencedRelation: "inventory_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_inventory_reservations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_inventory_reservations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
          delivery_assigned_at: string | null
          delivery_fee: number | null
          delivery_mode: string | null
          delivery_quote: number | null
          delivery_status: string
          dispatched_at: string | null
          driver_name: string | null
          due_at: string
          expedition_notes: string | null
          expedition_status: string
          expires_at: string | null
          fulfillment_source_id: string | null
          fulfillment_store_id: string | null
          id: string
          inventory_allocated_at: string | null
          inventory_reserved_at: string | null
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
          tracking_code: string | null
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
          delivery_assigned_at?: string | null
          delivery_fee?: number | null
          delivery_mode?: string | null
          delivery_quote?: number | null
          delivery_status?: string
          dispatched_at?: string | null
          driver_name?: string | null
          due_at?: string
          expedition_notes?: string | null
          expedition_status?: string
          expires_at?: string | null
          fulfillment_source_id?: string | null
          fulfillment_store_id?: string | null
          id?: string
          inventory_allocated_at?: string | null
          inventory_reserved_at?: string | null
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
          tracking_code?: string | null
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
          delivery_assigned_at?: string | null
          delivery_fee?: number | null
          delivery_mode?: string | null
          delivery_quote?: number | null
          delivery_status?: string
          dispatched_at?: string | null
          driver_name?: string | null
          due_at?: string
          expedition_notes?: string | null
          expedition_status?: string
          expires_at?: string | null
          fulfillment_source_id?: string | null
          fulfillment_store_id?: string | null
          id?: string
          inventory_allocated_at?: string | null
          inventory_reserved_at?: string | null
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
          tracking_code?: string | null
          user_id?: string | null
          vehicle_plate?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_fulfillment_source_id_fkey"
            columns: ["fulfillment_source_id"]
            isOneToOne: false
            referencedRelation: "inventory_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_fulfillment_store_id_fkey"
            columns: ["fulfillment_store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_audit: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          details: Json
          entity_id: string | null
          id: number
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          id?: never
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          details?: Json
          entity_id?: string | null
          id?: never
        }
        Relationships: []
      }
      partner_inventory: {
        Row: {
          on_hand: number
          product_id: string
          reserved: number
          store_id: string
          updated_at: string
        }
        Insert: {
          on_hand?: number
          product_id: string
          reserved?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          on_hand?: number
          product_id?: string
          reserved?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_inventory_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_inventory_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_offers: {
        Row: {
          available_at: string
          declined: boolean
          distance_km: number
          priority_score: number
          request_id: string
          store_id: string
        }
        Insert: {
          available_at: string
          declined?: boolean
          distance_km: number
          priority_score?: number
          request_id: string
          store_id: string
        }
        Update: {
          available_at?: string
          declined?: boolean
          distance_km?: number
          priority_score?: number
          request_id?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_offers_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "partner_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_offers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payout_accounts: {
        Row: {
          holder_document: string
          holder_name: string
          pix_key: string
          pix_key_type: string
          store_id: string
          updated_at: string
        }
        Insert: {
          holder_document: string
          holder_name: string
          pix_key: string
          pix_key_type: string
          store_id: string
          updated_at?: string
        }
        Update: {
          holder_document?: string
          holder_name?: string
          pix_key?: string
          pix_key_type?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payout_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payouts: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          id: string
          paid_at: string | null
          paid_by: string | null
          receipt_reference: string | null
          request_id: string
          status: string
          store_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          receipt_reference?: string | null
          request_id: string
          status?: string
          store_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          id?: string
          paid_at?: string | null
          paid_by?: string | null
          receipt_reference?: string | null
          request_id?: string
          status?: string
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payouts_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: true
            referencedRelation: "partner_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_requests: {
        Row: {
          accepted_at: string | null
          commission: number
          created_at: string
          customer: Json
          customer_id: string
          delivered_at: string | null
          eta_minutes: number | null
          expires_at: string
          fee: number
          id: string
          items: Json
          lat: number
          lng: number
          order_id: string | null
          policy_version: string
          quote_source: string | null
          reserved: boolean
          route_km: number | null
          shipping: number | null
          status: string
          store_id: string | null
          subtotal: number
          weight_kg: number | null
        }
        Insert: {
          accepted_at?: string | null
          commission?: number
          created_at?: string
          customer: Json
          customer_id: string
          delivered_at?: string | null
          eta_minutes?: number | null
          expires_at?: string
          fee?: number
          id?: string
          items: Json
          lat: number
          lng: number
          order_id?: string | null
          policy_version?: string
          quote_source?: string | null
          reserved?: boolean
          route_km?: number | null
          shipping?: number | null
          status?: string
          store_id?: string | null
          subtotal: number
          weight_kg?: number | null
        }
        Update: {
          accepted_at?: string | null
          commission?: number
          created_at?: string
          customer?: Json
          customer_id?: string
          delivered_at?: string | null
          eta_minutes?: number | null
          expires_at?: string
          fee?: number
          id?: string
          items?: Json
          lat?: number
          lng?: number
          order_id?: string | null
          policy_version?: string
          quote_source?: string | null
          reserved?: boolean
          route_km?: number | null
          shipping?: number | null
          status?: string
          store_id?: string | null
          subtotal?: number
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_requests_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_stock_movements: {
        Row: {
          actor_id: string | null
          created_at: string
          delta: number
          id: number
          product_id: string
          reason: string
          request_id: string | null
          store_id: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string
          delta: number
          id?: never
          product_id: string
          reason: string
          request_id?: string | null
          store_id: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string
          delta?: number
          id?: never
          product_id?: string
          reason?: string
          request_id?: string | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_stock_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_stock_movements_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "partner_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_stock_movements_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "partner_stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_stores: {
        Row: {
          accepted_terms_version: number
          address: string
          city: string | null
          commission_bps: number
          created_at: string
          delivery_base: number
          delivery_mode: string
          delivery_per_kg: number
          delivery_per_km: number
          document: string
          fee_bps: number
          id: string
          is_open: boolean
          lat: number
          lng: number
          name: string
          own_driver_available: boolean
          owner_id: string
          phone: string
          radius_km: number
          state: string | null
          status: string
          terms_version: number
          zip: string | null
        }
        Insert: {
          accepted_terms_version?: number
          address: string
          city?: string | null
          commission_bps?: number
          created_at?: string
          delivery_base?: number
          delivery_mode?: string
          delivery_per_kg?: number
          delivery_per_km?: number
          document: string
          fee_bps?: number
          id?: string
          is_open?: boolean
          lat: number
          lng: number
          name: string
          own_driver_available?: boolean
          owner_id: string
          phone: string
          radius_km?: number
          state?: string | null
          status?: string
          terms_version?: number
          zip?: string | null
        }
        Update: {
          accepted_terms_version?: number
          address?: string
          city?: string | null
          commission_bps?: number
          created_at?: string
          delivery_base?: number
          delivery_mode?: string
          delivery_per_kg?: number
          delivery_per_km?: number
          document?: string
          fee_bps?: number
          id?: string
          is_open?: boolean
          lat?: number
          lng?: number
          name?: string
          own_driver_available?: boolean
          owner_id?: string
          phone?: string
          radius_km?: number
          state?: string | null
          status?: string
          terms_version?: number
          zip?: string | null
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
          height_cm: number | null
          id: string
          image_url: string | null
          in_catalog: boolean
          length_cm: number | null
          min_qty: number
          name: string
          sort_order: number
          stock: number
          unit_price: number
          updated_at: string
          weight_kg: number | null
          wholesale_price: number
          width_cm: number | null
        }
        Insert: {
          active?: boolean
          badge?: string | null
          badge_color?: string | null
          catalog_order?: number
          category: string
          created_at?: string
          height_cm?: number | null
          id?: string
          image_url?: string | null
          in_catalog?: boolean
          length_cm?: number | null
          min_qty?: number
          name: string
          sort_order?: number
          stock?: number
          unit_price?: number
          updated_at?: string
          weight_kg?: number | null
          wholesale_price?: number
          width_cm?: number | null
        }
        Update: {
          active?: boolean
          badge?: string | null
          badge_color?: string | null
          catalog_order?: number
          category?: string
          created_at?: string
          height_cm?: number | null
          id?: string
          image_url?: string | null
          in_catalog?: boolean
          length_cm?: number | null
          min_qty?: number
          name?: string
          sort_order?: number
          stock?: number
          unit_price?: number
          updated_at?: string
          weight_kg?: number | null
          wholesale_price?: number
          width_cm?: number | null
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
          business_segment: string | null
          cnpj: string | null
          company_legal_name: string | null
          company_trade_name: string | null
          cpf: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          phone: string | null
          registration_notes: string | null
          state_registration: string | null
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
          business_segment?: string | null
          cnpj?: string | null
          company_legal_name?: string | null
          company_trade_name?: string | null
          cpf?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id?: string
          phone?: string | null
          registration_notes?: string | null
          state_registration?: string | null
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
          business_segment?: string | null
          cnpj?: string | null
          company_legal_name?: string | null
          company_trade_name?: string | null
          cpf?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          registration_notes?: string | null
          state_registration?: string | null
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
      admin_adjust_central_stock: {
        Args: { _delta: number; _product_id: string }
        Returns: number
      }
      admin_set_inventory_balance: {
        Args: { _product_id: string; _quantity: number; _source_id: string }
        Returns: number
      }
      allocate_paid_order_inventory: {
        Args: { _order_id: string }
        Returns: boolean
      }
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
          delivery_assigned_at: string | null
          delivery_fee: number | null
          delivery_mode: string | null
          delivery_quote: number | null
          delivery_status: string
          dispatched_at: string | null
          driver_name: string | null
          due_at: string
          expedition_notes: string | null
          expedition_status: string
          expires_at: string | null
          fulfillment_source_id: string | null
          fulfillment_store_id: string | null
          id: string
          inventory_allocated_at: string | null
          inventory_reserved_at: string | null
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
          tracking_code: string | null
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
      partner_command: {
        Args: { p_action: string; p_payload?: Json }
        Returns: Json
      }
      partner_payment_snapshot: {
        Args: { p_customer_id: string; p_order_id: string }
        Returns: Json
      }
      partner_set_delivery_availability: {
        Args: {
          p_delivery_mode: string
          p_own_driver_available: boolean
          p_store_id: string
        }
        Returns: undefined
      }
      release_order_inventory: { Args: { _order_id: string }; Returns: boolean }
      reserve_order_inventory: { Args: { _order_id: string }; Returns: boolean }
      service_expire_stale_orders: { Args: never; Returns: number }
      service_expire_stale_partner_requests: { Args: never; Returns: number }
      service_melhor_envio_begin_oauth: {
        Args: { p_state: string }
        Returns: undefined
      }
      service_melhor_envio_consume_oauth_state: {
        Args: { p_state: string }
        Returns: boolean
      }
      service_melhor_envio_store_token: {
        Args: {
          p_access_token: string
          p_expires_in: number
          p_refresh_token: string
          p_scope?: string
          p_token_type: string
        }
        Returns: undefined
      }
      service_melhor_envio_token: {
        Args: never
        Returns: {
          access_token: string
          expires_at: string
          refresh_expires_at: string
          refresh_token: string
          scope: string
          token_type: string
        }[]
      }
      service_partner_checkout_valid: {
        Args: { p_order_id: string }
        Returns: boolean
      }
      service_partner_mark_order_paid: {
        Args: { p_order_id: string }
        Returns: undefined
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
