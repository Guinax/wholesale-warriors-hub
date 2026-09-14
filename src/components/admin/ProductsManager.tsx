import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { DbProduct, ProductCategory } from "@/hooks/useProducts";
import { logAudit } from "@/lib/audit";
import MediaUploader from "@/components/admin/MediaUploader";


const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "suplementos", label: "Suplementos" },
  { value: "roupas", label: "Roupas" },
  { value: "acessorios", label: "Acessórios" },
  { value: "equipamento", label: "Equipamento" },
  { value: "bebidas", label: "Bebidas" },
];

type FormState = {
  id?: string;
  category: ProductCategory;
  name: string;
  unit_price: string;
  wholesale_price: string;
  min_qty: string;
  image_url: string;
  badge: string;
  badge_color: string;
  sort_order: string;
  active: boolean;
};

const emptyForm: FormState = {
  category: "suplementos",
  name: "",
  unit_price: "",
  wholesale_price: "",
  min_qty: "1",
  image_url: "",
  badge: "",
  badge_color: "",
  sort_order: "0",
  active: true,
};

const ProductsManager = ({ lockedCategory }: { lockedCategory?: ProductCategory }) => {
  const [products, setProducts] = useState<DbProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>(lockedCategory ?? "all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products" as any)
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) toast.error("Erro ao carregar produtos");
    else setProducts(((data ?? []) as unknown) as DbProduct[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm({ ...emptyForm, category: lockedCategory ?? emptyForm.category });
    setOpen(true);
  };

  const openEdit = (p: DbProduct) => {
    setForm({
      id: p.id,
      category: p.category,
      name: p.name,
      unit_price: String(p.unit_price),
      wholesale_price: String(p.wholesale_price),
      min_qty: String(p.min_qty),
      image_url: p.image_url ?? "",
      badge: p.badge ?? "",
      badge_color: p.badge_color ?? "",
      sort_order: String(p.sort_order),
      active: p.active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.unit_price || !form.wholesale_price) {
      toast.error("Preencha nome e preços");
      return;
    }
    const payload = {
      category: form.category,
      name: form.name,
      unit_price: Number(form.unit_price),
      wholesale_price: Number(form.wholesale_price),
      min_qty: Number(form.min_qty) || 1,
      image_url: form.image_url || null,
      badge: form.badge || null,
      badge_color: form.badge_color || null,
      sort_order: Number(form.sort_order) || 0,
      active: form.active,
    };
    const { error } = form.id
      ? await supabase.from("products" as any).update(payload).eq("id", form.id)
      : await supabase.from("products" as any).insert(payload);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    logAudit(form.id ? "product_updated" : "product_created", {
      entity: "products",
      entity_id: form.id,
      details: { name: form.name, category: form.category },
    });
    toast.success(form.id ? "Produto atualizado" : "Produto criado");
    setOpen(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Excluir este produto?")) return;
    const { error } = await supabase.from("products" as any).delete().eq("id", id);
    if (error) {
      toast.error("Erro ao excluir");
      return;
    }
    logAudit("product_deleted", { entity: "products", entity_id: id });
    toast.success("Produto excluído");
    load();
  };

  const filtered =
    filterCategory === "all"
      ? products
      : products.filter((p) => p.category === filterCategory);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4" /> Novo produto
        </Button>
      </div>

      <div className="space-y-2">
        {loading && <Card className="p-6 text-center text-sm text-muted-foreground">Carregando...</Card>}
        {!loading && filtered.length === 0 && (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum produto.</Card>
        )}
        {filtered.map((p) => (
          <Card key={p.id} className="p-3 flex items-center gap-3">
            <div className="w-12 h-12 rounded-md bg-secondary overflow-hidden flex-shrink-0">
              {p.image_url && (
                <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {p.category} · Atacado R$ {Number(p.wholesale_price).toFixed(2)} · Mín {p.min_qty}
                {!p.active && " · INATIVO"}
              </p>
            </div>
            <Button size="icon" variant="outline" onClick={() => openEdit(p)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={() => remove(p.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v as ProductCategory })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Preço unitário</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.unit_price}
                  onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
                />
              </div>
              <div>
                <Label>Preço atacado</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.wholesale_price}
                  onChange={(e) => setForm({ ...form, wholesale_price: e.target.value })}
                />
              </div>
              <div>
                <Label>Quantidade mínima</Label>
                <Input
                  type="number"
                  value={form.min_qty}
                  onChange={(e) => setForm({ ...form, min_qty: e.target.value })}
                />
              </div>
              <div>
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                />
              </div>
            </div>
            <MediaUploader
              label="Foto do produto"
              value={form.image_url}
              onChange={(url) => setForm({ ...form, image_url: url })}
              kind="image"
              folder="produtos"
            />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Selo (badge)</Label>
                <Input
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                  placeholder="LANÇAMENTO"
                />
              </div>
              <div>
                <Label>Cor do selo</Label>
                <Input
                  value={form.badge_color}
                  onChange={(e) => setForm({ ...form, badge_color: e.target.value })}
                  placeholder="bg-success"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.active}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
              <Label>Ativo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsManager;
