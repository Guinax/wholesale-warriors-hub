import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, Link2, X, Loader2 } from "lucide-react";
import { uploadMedia } from "@/lib/mediaUpload";

interface MediaUploaderProps {
  label: string;
  value: string;
  onChange: (url: string) => void;
  /** "image" ou "video" */
  kind?: "image" | "video";
  folder?: string;
  /** Tamanho máximo em MB */
  maxMb?: number;
}

const MediaUploader = ({
  label,
  value,
  onChange,
  kind = "image",
  folder = "uploads",
  maxMb = kind === "video" ? 200 : 10,
}: MediaUploaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showLink, setShowLink] = useState(false);

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Máximo ${maxMb}MB.`);
      return;
    }
    if (kind === "video" && file.type && !file.type.startsWith("video/")) {
      toast.error("Selecione um arquivo de vídeo válido (como MP4).");
      return;
    }
    setUploading(true);
    try {
      const { url } = await uploadMedia(file, folder);
      onChange(url);
      toast.success("Arquivo enviado!");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Erro desconhecido";
      toast.error(`Não foi possível enviar o arquivo: ${detail}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-secondary">
          {kind === "video" ? (
            <video src={value} controls className="w-full max-h-48 bg-black" />
          ) : (
            <img src={value} alt={label} className="w-full max-h-48 object-contain bg-black/20" />
          )}
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange("")}
            aria-label="Remover mídia"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept={kind === "video" ? "video/*" : "image/*"}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              {value ? "Trocar arquivo" : "Escolher do dispositivo"}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setShowLink((s) => !s)}
          aria-label="Usar link"
        >
          <Link2 className="w-4 h-4" />
        </Button>
      </div>

      {showLink && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
        />
      )}
    </div>
  );
};

export default MediaUploader;
