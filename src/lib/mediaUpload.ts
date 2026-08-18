import { supabase } from "@/integrations/supabase/client";

export const MEDIA_BUCKET = "media";
const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

const slugify = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.]+/g, "-")
    .toLowerCase();

/** Envia um arquivo para o bucket "media" e devolve uma URL utilizável no app */
export async function uploadMedia(file: File, folder = "uploads") {
  const path = `${folder}/${Date.now()}-${slugify(file.name)}`;
  const { error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;

  const { data, error: signError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(path, TEN_YEARS);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Falha ao gerar URL");

  return { path, url: data.signedUrl };
}
