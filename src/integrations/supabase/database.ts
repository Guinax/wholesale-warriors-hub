import type { Database as GeneratedDatabase } from "./types";

type AdminCampaignsTable = {
  Row: {
    id: string;
    created_by: string;
    product_id: string | null;
    name: string;
    headline: string;
    body: string;
    cta: string;
    destination_url: string;
    media_urls: string[];
    platforms: string[];
    status: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    created_by: string;
    product_id?: string | null;
    name: string;
    headline?: string;
    body?: string;
    cta?: string;
    destination_url?: string;
    media_urls?: string[];
    platforms?: string[];
    status?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    created_by?: string;
    product_id?: string | null;
    name?: string;
    headline?: string;
    body?: string;
    cta?: string;
    destination_url?: string;
    media_urls?: string[];
    platforms?: string[];
    status?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Tables"> & {
    Tables: GeneratedDatabase["public"]["Tables"] & {
      admin_campaigns: AdminCampaignsTable;
    };
  };
};
