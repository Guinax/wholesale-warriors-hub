import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, RefreshCw, Search } from "lucide-react";

type AuditLog = {
  id: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  details: any;
  user_agent: string | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  login: "Login",
  logout: "Logout",
  signup: "Cadastro",
  order_created: "Pedido criado",
  order_updated: "Pedido atualizado",
  product_created: "Produto criado",
  product_updated: "Produto editado",
  product_deleted: "Produto excluído",
  admin_access: "Acesso ao painel",
  page_view: "Visita",
};

const ACTION_COLOR: Record<string, string> = {
  login: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  logout: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  signup: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  order_created: "bg-primary/15 text-primary",
  order_updated: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  product_created: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  product_updated: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  product_deleted: "bg-red-500/15 text-red-700 dark:text-red-300",
  admin_access: "bg-purple-500/15 text-purple-700 dark:text-purple-300",
};

const AuditLogsManager = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("audit_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar logs: " + error.message);
      return;
    }
    setLogs(((data ?? []) as unknown) as AuditLog[]);
  };

  useEffect(() => {
    load();
  }, []);

  const actions = useMemo(
    () => Array.from(new Set(logs.map((l) => l.action))).sort(),
    [logs]
  );

  const filtered = logs.filter((l) => {
    if (filterAction !== "all" && l.action !== filterAction) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.user_email?.toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      l.entity?.toLowerCase().includes(q) ||
      l.entity_id?.toLowerCase().includes(q) ||
      JSON.stringify(l.details ?? "").toLowerCase().includes(q)
    );
  });

  const shortAgent = (ua: string | null) => {
    if (!ua) return "—";
    if (/iPhone|iPad/i.test(ua)) return "iOS";
    if (/Android/i.test(ua)) return "Android";
    if (/Windows/i.test(ua)) return "Windows";
    if (/Mac OS X/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
    return "Web";
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">
            Log de auditoria ({logs.length})
          </h2>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar e-mail, ação, detalhe..."
              className="pl-9"
            />
          </div>
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ação" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as ações</SelectItem>
              {actions.map((a) => (
                <SelectItem key={a} value={a}>
                  {ACTION_LABEL[a] ?? a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {loading ? "Carregando..." : "Nenhum registro."}
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((l) => (
            <Card key={l.id} className="p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className={ACTION_COLOR[l.action] ?? ""} variant="secondary">
                      {ACTION_LABEL[l.action] ?? l.action}
                    </Badge>
                    {l.entity && (
                      <span className="text-xs text-muted-foreground font-mono">
                        {l.entity}
                        {l.entity_id ? `:${l.entity_id.slice(0, 8)}` : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold mt-1 truncate">
                    {l.user_email ?? "anônimo"}
                  </p>
                  {l.details && (
                    <pre className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap break-all">
                      {JSON.stringify(l.details, null, 0)}
                    </pre>
                  )}
                </div>
                <div className="text-right text-[11px] text-muted-foreground flex-shrink-0">
                  <p>{new Date(l.created_at).toLocaleString("pt-BR")}</p>
                  <p>{shortAgent(l.user_agent)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AuditLogsManager;
