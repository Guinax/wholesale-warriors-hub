import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Facebook, ImagePlus, Instagram, MessageCircle, Save, Share2, ShieldCheck, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import MediaUploader from "@/components/admin/MediaUploader";
import { toast } from "sonner";

type Campaign = {
  id: string;
  name: string;
  headline: string;
  media_urls: string[];
  created_at: string;
};

const CampaignMediaStudio = () => {
  const navigate = useNavigate();
  const { user, isAdmin, loading } = useAdminAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState("");
  const [image1, setImage1] = useState("");
  const [image2, setImage2] = useState("");
  const [video, setVideo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.title = "Mídia de Campanhas | Família Maromba";
  }, []);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
    if (!loading && user && !isAdmin) navigate("/", { replace: true });
  }, [loading, user, isAdmin, navigate]);

  const loadCampaigns = useCallback(async () => {
    if (!isAdmin) return;
    const { data, error } = await supabase
      .from("admin_campaigns")
      .select("id,name,headline,media_urls,created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Não foi possível carregar as campanhas.");
      return;
    }
    setCampaigns(data ?? []);
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) void loadCampaigns();
  }, [isAdmin, loadCampaigns]);

  const selected = useMemo(
    () => campaigns.find((c) => c.id === campaignId) ?? null,
    [campaigns, campaignId]
  );

  useEffect(() => {
    if (!selected) {
      setImage1("");
      setImage2("");
      setVideo("");
      return;
    }
    const media = Array.isArray(selected.media_urls) ? selected.media_urls : [];
    setImage1(media[0] ?? "");
    setImage2(media[1] ?? "");
    setVideo(media[2] ?? "");
  }, [selected]);

  const shareCampaign = async () => {
    if (!selected) {
      toast.error("Selecione uma campanha.");
      return;
    }

    const shareText = [selected.name, selected.headline].filter(Boolean).join("\n");
    const shareData = {
      title: selected.name,
      text: shareText,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(shareText);
      toast.success("Texto da campanha copiado para compartilhar.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível compartilhar a campanha.");
    }
  };

  const campaignShareText = () => selected ? [selected.name, selected.headline].filter(Boolean).join("\n") : "";

  const shareWhatsApp = () => {
    if (!selected) return toast.error("Selecione uma campanha.");
    window.open(`https://wa.me/?text=${encodeURIComponent(campaignShareText())}`, "_blank", "noopener,noreferrer");
  };

  const shareFacebook = () => {
    if (!selected) return toast.error("Selecione uma campanha.");
    const url = window.location.origin;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(campaignShareText())}`, "_blank", "noopener,noreferrer");
  };

  const shareInstagram = async () => {
    if (!selected) return toast.error("Selecione uma campanha.");
    const text = campaignShareText();
    try {
      if (navigator.share) {
        await navigator.share({ title: selected.name, text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast.success("Texto copiado. Abra o Instagram e cole na publicação ou story.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível preparar o compartilhamento no Instagram.");
    }
  };

  const save = async () => {
    if (!selected) {
      toast.error("Selecione uma campanha.");
      return;
    }
    const media_urls = [image1, image2, video].filter(Boolean);
    setSaving(true);
    const { error } = await supabase
      .from("admin_campaigns")
      .update({ media_urls, updated_at: new Date().toISOString() })
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error("Não foi possível salvar as mídias.", { description: error.message });
      return;
    }
    toast.success("Mídias da campanha atualizadas.");
    await loadCampaigns();
  };

  if (loading || !isAdmin) {
    return <div className="min-h-screen grid place-items-center bg-background">Carregando estúdio de mídia...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="container h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} aria-label="Voltar">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <ShieldCheck className="w-5 h-5 text-primary" />
            <div>
              <p className="font-heading font-black text-sm">MÍDIA DE CAMPANHAS</p>
              <p className="text-[11px] text-muted-foreground">Fotos e vídeos · somente admin</p>
            </div>
          </div>
          <Button variant="outline" asChild><Link to="/admin/comando">Centro de Comando</Link></Button>
        </div>
      </header>

      <main className="container py-6 max-w-5xl space-y-5">
        <Card className="p-5 space-y-4">
          <div className="space-y-2">
            <Label>Campanha</Label>
            <Select value={campaignId} onValueChange={setCampaignId}>
              <SelectTrigger><SelectValue placeholder="Selecione um rascunho de campanha" /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {selected && (
            <div className="rounded-lg border p-3 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold">{selected.name}</p>
                <p className="text-xs text-muted-foreground">{selected.headline}</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={shareWhatsApp} aria-label="Compartilhar no WhatsApp">
                  <MessageCircle className="w-4 h-4" /> WhatsApp
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={shareFacebook} aria-label="Compartilhar no Facebook">
                  <Facebook className="w-4 h-4" /> Facebook
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={shareInstagram} aria-label="Compartilhar no Instagram">
                  <Instagram className="w-4 h-4" /> Instagram
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={shareCampaign} aria-label="Mais opções de compartilhamento">
                  <Share2 className="w-4 h-4" /> Mais opções
                </Button>
              </div>
            </div>
          )}
        </Card>

        <div className="grid md:grid-cols-2 gap-5">
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2"><ImagePlus className="w-5 h-5 text-primary" /><h2 className="font-heading font-black">FOTOS</h2></div>
            <MediaUploader label="Foto principal" value={image1} onChange={setImage1} folder="campaigns/images" kind="image" />
            <MediaUploader label="Foto adicional" value={image2} onChange={setImage2} folder="campaigns/images" kind="image" />
          </Card>

          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2"><Video className="w-5 h-5 text-primary" /><h2 className="font-heading font-black">VÍDEO</h2></div>
            <MediaUploader label="Vídeo da campanha" value={video} onChange={setVideo} folder="campaigns/videos" kind="video" maxMb={200} />
          </Card>
        </div>

        <Button className="w-full" size="lg" onClick={save} disabled={!selected || saving}>
          <Save className="w-4 h-4" /> {saving ? "Salvando..." : "Salvar mídias da campanha"}
        </Button>
      </main>
    </div>
  );
};

export default CampaignMediaStudio;
