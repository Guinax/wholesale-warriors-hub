import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, RefreshCw } from "lucide-react";
import { useVideos, parseYoutubeId, youtubeThumb, type DbVideo } from "@/hooks/useVideos";
import { logAudit } from "@/lib/audit";

type FormState = {
  id?: string;
  title: string;
  description: string;
  url: string;
  sort_order: string;
  active: boolean;
};

const emptyForm: FormState = {
  title: "",
  description: "",
  url: "",
  sort_order: "0",
  active: true,
};

const VideosManager = () => {
  const { videos, loading, reload } = useVideos(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setForm({ ...emptyForm, sort_order: String(videos.length) });
    setOpen(true);
  };

  const openEdit = (v: DbVideo) => {
    setForm({
      id: v.id,
      title: v.title,
      description: v.description ?? "",
      url: `https://youtu.be/${v.youtube_id}`,
      sort_order: String(v.sort_order),
      active: v.active,
    });
    setOpen(true);
  };

  const save = async () => {
    const youtube_id = parseYoutubeId(form.url);
    if (!form.title.trim()) return toast.error("Informe o título do vídeo");
    if (!youtube_id) return toast.error("Link do YouTube inválido");

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      youtube_id,
      sort_order: Number(form.sort_order) || 0,
      active: form.active,
    };

    const { error } = form.id
      ? await supabase.from("videos" as never).update(payload as never).eq("id", form.id)
      : await supabase.from("videos" as never).insert(payload as never);

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar vídeo");
      return;
    }
    logAudit(form.id ? "video_update" : "video_create", { entity: "videos", details: payload });
    toast.success(form.id ? "Vídeo atualizado" : "Vídeo adicionado");
    setOpen(false);
    reload();
  };

  const remove = async (v: DbVideo) => {
    if (!confirm(`Remover o vídeo "${v.title}"?`)) return;
    const { error } = await supabase.from("videos" as never).delete().eq("id", v.id);
    if (error) return toast.error("Erro ao remover vídeo");
    logAudit("video_delete", { entity: "videos", entity_id: v.id });
    toast.success("Vídeo removido");
    reload();
  };

  const toggleActive = async (v: DbVideo) => {
    const { error } = await supabase
      .from("videos" as never)
      .update({ active: !v.active } as never)
      .eq("id", v.id);
    if (error) return toast.error("Erro ao atualizar");
    reload();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading font-bold text-lg">Vídeos do YouTube</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={reload} aria-label="Recarregar">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-1" /> Novo vídeo
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : videos.length === 0 ? (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Nenhum vídeo cadastrado. Adicione o primeiro para exibir na página inicial.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {videos.map((v) => (
            <Card key={v.id} className="p-3 flex gap-3">
              <img
                src={youtubeThumb(v.youtube_id)}
                alt={v.title}
                className="w-28 h-16 object-cover rounded-md shrink-0"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{v.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  Ordem {v.sort_order} · {v.active ? "Ativo" : "Oculto"}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Switch checked={v.active} onCheckedChange={() => toggleActive(v)} />
                  <Button size="icon" variant="ghost" onClick={() => openEdit(v)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(v)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar vídeo" : "Novo vídeo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="v-title">Título</Label>
              <Input
                id="v-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Lançamento Combo Drinks"
              />
            </div>
            <div>
              <Label htmlFor="v-url">Link do YouTube</Label>
              <Input
                id="v-url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://youtu.be/XXXXXXXX"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Aceita link normal, youtu.be, Shorts ou live.
              </p>
            </div>
            <div>
              <Label htmlFor="v-desc">Descrição (opcional)</Label>
              <Textarea
                id="v-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="v-order">Ordem</Label>
                <Input
                  id="v-order"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  checked={form.active}
                  onCheckedChange={(c) => setForm({ ...form, active: c })}
                />
                <span className="text-sm">Ativo</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideosManager;
