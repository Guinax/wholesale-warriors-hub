import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ProductCategory = "suplementos" | "roupas" | "acessorios" | "equipamento" | "bebidas" | "alimentos";

export interface DbProduct {
  id: string;
  category: ProductCategory;
  name: string;
  unit_price: number;
  wholesale_price: number;
  min_qty: number;
  image_url: string | null;
  badge: string | null;
  badge_color: string | null;
  sort_order: number;
  active: boolean;
}

const formatBRL = (n: number) =>
  `R$ ${Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const toCategoryProduct = (p: DbProduct) => ({
  badge: p.badge ?? undefined,
  badgeColor: p.badge_color ?? undefined,
  name: p.name,
  unitPrice: formatBRL(p.unit_price),
  wholesalePrice: formatBRL(p.wholesale_price),
  minQty: p.min_qty,
  image: p.image_url ?? undefined,
});

export function useProducts(category?: ProductCategory) {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("products" as any)
      .select("*")
      .eq("active", true)
      .order("sort_order", { ascending: true });
    if (category) q = q.eq("category", category);
    const { data } = await q;
    setProducts(((data ?? []) as unknown) as DbProduct[]);
    setLoading(false);
  }, [category]);

  useEffect(() => {
    load();
  }, [load]);

  return { products, loading, reload: load };
}
