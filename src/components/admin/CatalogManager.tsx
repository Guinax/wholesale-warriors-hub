import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Star, X } from "lucide-react";
import type { DbProduct, ProductCategory } from "@/hooks/useProducts";
import { logAudit } from "@/lib/audit";

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "suplementos", label: "Suplementos" },
  { value: "roupas", label: "Roupas" },
  { value: "acessorios", label: "Acessórios" },
  { value: "equipamento", label: "Equipamento" },
  { value: "bebidas", label: "Bebidas" },
  { value: "alimentos", label: "Alimentar" },
];

type CatalogProduct = DbProduct & { in_catalog: boolean; catalog_order: number };

const CatalogManager = () => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [catalogTitle, setCatalogTitle] = useState("CATÁLOGO VIGENTE");
  const [catalogSubtitle, setCatalogSubtitle] = useState("ESTILO CIMED x MAROMBA");
  const [savingSettings, setSavingSettings] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });
    if (error) toast.error("Erro ao carregar produtos");
    else setProducts(((data ?? []) as unknown) as CatalogProduct[]);
    const { data: settings } = await supabase
      .from("catalog_settings" as never)
      .select("title, subtitle")
      .eq("id", 1)
      .maybeSingle();
    if (settings) {
      const s = settings as unknown as { title: string; subtitle: string };
      setCatalogTitle(s.title || "CATÁLOGO VIGENTE");
      setCatalogSubtitle(s.subtitle || "ESTILO CIMED x MAROMBA");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const inCatalog = products
    .filter((p) => p.in_catalog)
    .sort((a, b) => a.catalog_order - b.catalog_order);

  const available = products
    .filter((p) => !p.in_catalog)
    .filter((p) => (category === "all" ? true : p.category === category))
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  const update = async (id: string, patch: Record<string, unknown>, msg?: string) => {
    const { error } = await supabase.from("products").update(patch).eq("id", id);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    if (msg) toast.success(msg);
    load();
  };

  const saveCatalogSettings = async () => {
    setSavingSettings(true);
    const { error } = await supabase
      .from("catalog_settings" as never)
      .upsert({ id: 1, title: catalogTitle.trim(), subtitle: catalogSubtitle.trim() } as never);
    setSavingSettings(false);
    if (error) {
      toast.error("Erro ao salvar apresentação do catálogo: " + error.message);
      return;
    }
    logAudit("catalog_settings_updated", { entity: "catalog_settings", entity_id: "1", details: { title: catalogTitle, subtitle: catalogSubtitle } });
    toast.success("Apresentação do catálogo atualizada");
  };

  const add = (p: CatalogProduct) => {
    const nextOrder = inCatalog.length ? Math.max(...inCatalog.map((i) => i.catalog_order)) + 1 : 0;
    logAudit("catalog_product_added", { entity: "products", entity_id: p.id, details: { name: p.name } });
    update(p.id, { in_catalog: true, catalog_order: nextOrder }, "Adicionado ao catálogo vigente");
  };

  const removeItem = (p: CatalogProduct) => {
    logAudit("catalog_product_removed", { entity: "products", entity_id: p.id, details: { name: p.name } });
    update(p.id, { in_catalog: false }, "Removido do catálogo vigente");
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= inCatalog.length) return;
    const a = inCatalog[index];
    const b = inCatalog[target];
    await supabase.from("products").update({ catalog_order: b.catalog_order }).eq("id", a.id);
    await supabase.from("products").update({ catalog_order: a.catalog_order }).eq("id", b.id);
    load();
  };

  return (
    <div className="space-y-6">
      <Card className="p-4 space-y-3">
        <div>
          <h2 className="font-heading font-bold tracking-wide text-sm">EDITAR PÁGINA INICIAL — CATÁLOGO</h2>
          <p className="text-xs text-muted-foreground mt-1">Edite os textos exibidos acima dos produtos no Catálogo Vigente da página inicial.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="text-xs font-semibold">Título</label>
            <Input value={catalogTitle} onChange={(e) => setCatalogTitle(e.target.value)} placeholder="CATÁLOGO VIGENTE" />
          </div>
          <div>
            <label className="text-xs font-semibold">Subtítulo</label>
            <Input value={catalogSubtitle} onChange={(e) => setCatalogSubtitle(e.target.value)} placeholder="ESTILO CIMED x MAROMBA" />
          </div>
        </div>
        <Button onClick={saveCatalogSettings} disabled={savingSettings || !catalogTitle.trim()}>
          {savingSettings ? "Salvando..." : "Salvar alterações da página inicial"}
        </Button>
      </Card>

      <div>
        <h2 className="font-heading font-bold tracking-wide text-sm mb-1">CATÁLOGO VIGENTE</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Produtos exibidos na seção "Catálogo Vigente" da página inicial.
        </p>
        <div className="space-y-2">
          {loading && (
            <Card className="p-6 text-center text-sm text-muted-foreground">Carregando...</Card>
          )}
          {!loading && inCatalog.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum produto no catálogo. Selecione abaixo.
            </Card>
          )}
          {inCatalog.map((p, i) => (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              <div className="w-12 h-12 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">
                  {p.category} · Atacado R$ {Number(p.wholesale_price).toFixed(2)}
                  {!p.active && " · INATIVO"}
                </p>
              </div>
              <Button size="icon" variant="outline" onClick={() => move(i, -1)} aria-label="Subir">
                <ArrowUp className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => move(i, 1)} aria-label="Descer">
                <ArrowDown className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="outline" onClick={() => removeItem(p)} aria-label="Remover">
                <X className="w-4 h-4" />
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-heading font-bold tracking-wide text-sm mb-2">
          ADICIONAR DAS CATEGORIAS
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            className="w-full sm:w-52"
            placeholder="Buscar produto"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          {!loading && available.length === 0 && (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              Nenhum produto disponível.
            </Card>
          )}
          {available.map((p) => (
            <Card key={p.id} className="p-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-secondary overflow-hidden flex-shrink-0">
                {p.image_url && (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.category}</p>
              </div>
              <Button size="sm" onClick={() => add(p)}>
                <Plus className="w-4 h-4" /> Catálogo
              </Button>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground flex items-center gap-1">
        <Star className="w-3 h-3" /> Também é possível marcar produtos pelo botão de estrela nas páginas de categoria.
      </p>
    </div>
  );
};

export default CatalogManager;
