import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "media";

const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .toLowerCase();

/** Envia um arquivo para o bucket público "media" e devolve uma URL permanente. */
export async function uploadMedia(file: File, folder = "uploads") {
  const path = `${folder}/${Date.now()}-${slugify(file.name)}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("Falha ao gerar URL pública da mídia");

  return { path, url: data.publicUrl };
}
