import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DbVideo {
  id: string;
  title: string;
  description: string | null;
  youtube_id: string;
  sort_order: number;
  active: boolean;
}

/** Aceita URL completa, youtu.be, shorts, embed ou o próprio ID */
export function parseYoutubeId(input: string): string {
  const value = input.trim();
  if (!value) return "";
  const patterns = [
    /(?:youtube\.com\/watch\?[^\s]*v=)([\w-]{6,})/i,
    /youtu\.be\/([\w-]{6,})/i,
    /youtube\.com\/shorts\/([\w-]{6,})/i,
    /youtube\.com\/embed\/([\w-]{6,})/i,
    /youtube\.com\/live\/([\w-]{6,})/i,
  ];
  for (const re of patterns) {
    const m = value.match(re);
    if (m) return m[1];
  }
  return /^[\w-]{6,}$/.test(value) ? value : "";
}

export const youtubeThumb = (id: string) =>
  `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

export function useVideos(onlyActive = true) {
  const [videos, setVideos] = useState<DbVideo[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("videos" as never)
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (onlyActive) q = q.eq("active", true);
    const { data } = await q;
    setVideos((data ?? []) as unknown as DbVideo[]);
    setLoading(false);
  }, [onlyActive]);

  useEffect(() => {
    load();
  }, [load]);

  return { videos, loading, reload: load };
}
