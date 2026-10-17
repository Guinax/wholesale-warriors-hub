import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";

type Visit = {
  id: number;
  visited_at: string;
  visitor_session: string;
  path: string;
  referrer_host: string | null;
  campaign_source: string | null;
  device_type: string;
  city: string | null;
  region: string | null;
  country: string | null;
};

export default function VisitorsManager() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const result = await supabase.from("site_visit_events" as never)
      .select("id,visited_at,visitor_session,path,referrer_host,campaign_source,device_type,city,region,country")
      .order("visited_at", { ascending: false }).limit(500);
    setLoading(false);
    if (result.error) {
      setError("Não foi possível consultar visitas. Verifique as permissões de administrador.");
      return;
    }
    setError("");
    setVisits((result.data ?? []) as Visit[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const unique = useMemo(() => new Set(visits.map(v => v.visitor_session)).size, [visits]);
  const today = useMemo(() => visits.filter(v => new Date(v.visited_at).toDateString() === new Date().toDateString()).length, [visits]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold">Monitoramento de visitantes</h2>
          <p className="text-sm text-muted-foreground">Acessos sem cadastro incluídos. Últimos 500 eventos registrados; números limitados a essa amostra.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
      </div>
      {error && <p className="text-destructive" role="alert">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3"><p className="text-xs text-muted-foreground">Visualizações</p><p className="text-2xl font-bold">{visits.length}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Sessões</p><p className="text-2xl font-bold">{unique}</p></Card>
        <Card className="p-3"><p className="text-xs text-muted-foreground">Hoje</p><p className="text-2xl font-bold">{today}</p></Card>
      </div>
      <p className="text-xs text-muted-foreground">Uma sessão não identifica uma pessoa. Cidade/estado são estimativas da rede; não representam GPS.</p>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left"><th className="p-3">Data e hora</th><th className="p-3">Página</th><th className="p-3">Origem</th><th className="p-3">Dispositivo</th><th className="p-3">Localização aproximada</th></tr></thead>
          <tbody>{visits.map(v => <tr key={v.id} className="border-b last:border-0">
            <td className="p-3 whitespace-nowrap">{new Date(v.visited_at).toLocaleString("pt-BR")}</td>
            <td className="p-3">{v.path}</td>
            <td className="p-3">{v.campaign_source || v.referrer_host || "Direto / desconhecido"}</td>
            <td className="p-3">{v.device_type}</td>
            <td className="p-3">{[v.city, v.region, v.country].filter(Boolean).join(" / ") || "Indisponível"}</td>
          </tr>)}</tbody>
        </table>
        {!loading && !visits.length && !error && <p className="p-4 text-sm text-muted-foreground">Nenhuma visita registrada ainda.</p>}
      </div>
    </div>
  );
}
