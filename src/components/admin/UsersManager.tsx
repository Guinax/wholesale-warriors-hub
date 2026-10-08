import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, RefreshCw, Save, Eye, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { logAudit } from "@/lib/audit";

type Profile = {
  id: string;
  user_id: string;
  user_code: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  cpf: string | null;
  cnpj: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  created_at: string;
};

type ProfileUpdate = Partial<Pick<Profile,
  | "full_name"
  | "email"
  | "phone"
  | "cpf"
  | "cnpj"
  | "address_street"
  | "address_number"
  | "address_complement"
  | "address_city"
  | "address_state"
  | "address_zip"
>>;

const EDITABLE_FIELDS: { key: keyof ProfileUpdate; label: string; placeholder?: string }[] = [
  { key: "full_name", label: "Nome completo" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone / WhatsApp" },
  { key: "cpf", label: "CPF" },
  { key: "cnpj", label: "CNPJ" },
  { key: "address_street", label: "Rua" },
  { key: "address_number", label: "Número" },
  { key: "address_complement", label: "Complemento" },
  { key: "address_city", label: "Cidade" },
  { key: "address_state", label: "UF", placeholder: "SP" },
  { key: "address_zip", label: "CEP" },
];

const UsersManager = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile | null>(null);
  const [form, setForm] = useState<Partial<Profile>>({});
  const [saving, setSaving] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar usuários: " + error.message);
      return;
    }
    setProfiles((data as Profile[]) || []);
  };

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, []);

  const openDetails = (p: Profile) => {
    setSelected(p);
    setForm({ ...p });
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    const updates: ProfileUpdate = {};
    for (const f of EDITABLE_FIELDS) {
      const val = (form[f.key] as string | null | undefined) ?? null;
      updates[f.key] = typeof val === "string" && val.trim() === "" ? null : val;
    }
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", selected.id);
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Dados do usuário atualizados!");
    logAudit("order_updated", {
      entity: "profiles",
      entity_id: selected.user_code,
      details: { updated_by_admin: true },
    });
    setSelected(null);
    load();
  };

  const handleDelete = async (p: Profile) => {
    if (!currentUserId) {
      toast.error("Não foi possível verificar sua conta. Entre novamente.");
      return;
    }
    if (p.user_id === currentUserId) {
      toast.error("Sua conta administrativa não pode ser excluída.");
      return;
    }
    if (!window.confirm(`Excluir definitivamente o cadastro de ${p.full_name || p.email}? Esta ação não pode ser desfeita.`)) return;

    setDeletingUserId(p.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_id: p.user_id },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || "Não foi possível excluir o usuário.");
      }
      toast.success("Usuário excluído com sucesso.");
      if (selected?.user_id === p.user_id) setSelected(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao excluir usuário.");
    } finally {
      setDeletingUserId(null);
    }
  };

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.email?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.user_code?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q) ||
      p.cpf?.toLowerCase().includes(q) ||
      p.cnpj?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">
            Usuários cadastrados ({profiles.length})
          </h2>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, ID, e-mail, CPF..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {loading ? "Carregando..." : "Nenhum usuário encontrado."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              className="p-4 space-y-2 cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => openDetails(p)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-sm truncate">
                    {p.full_name || "Sem nome"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant="secondary" className="font-mono text-[10px]">
                    {p.user_code}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    aria-label={p.user_id === currentUserId ? "Sua conta está protegida" : `Excluir ${p.full_name || p.email}`}
                    title={p.user_id === currentUserId ? "Sua conta está protegida" : "Excluir usuário"}
                    disabled={!currentUserId || p.user_id === currentUserId || deletingUserId !== null}
                    onClick={(event) => { event.stopPropagation(); void handleDelete(p); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Ver e editar">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {p.phone && <span>📱 {p.phone}</span>}
                {(p.cpf || p.cnpj) && <span>📄 {p.cnpj || p.cpf}</span>}
                {p.address_city && <span>📍 {p.address_city}{p.address_state ? `/${p.address_state}` : ""}</span>}
                <span>
                  Cadastrado: {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Editar usuário
              {selected && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {selected.user_code}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Cadastrado em {new Date(selected.created_at).toLocaleDateString("pt-BR")}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {EDITABLE_FIELDS.map((f) => (
                  <div
                    key={f.key}
                    className={f.key === "full_name" || f.key === "address_street" ? "sm:col-span-2" : ""}
                  >
                    <Label htmlFor={`edit-${f.key}`} className="text-xs">
                      {f.label}
                    </Label>
                    <Input
                      id={`edit-${f.key}`}
                      value={(form[f.key] as string) ?? ""}
                      placeholder={f.placeholder}
                      maxLength={f.key === "address_state" ? 2 : undefined}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, [f.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Salvando..." : "Salvar alterações"}
                </Button>
                <Button variant="outline" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UsersManager;
