import { useCallback, useEffect, useRef, useState } from "react";
import { Bike } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Courier = {
  id: string;
  courier_code: string;
  full_name: string;
  status: string;
  is_online: boolean;
  store_id: string;
};

type Job = {
  id: string;
  request_id: string;
  courier_id?: string | null;
  source: "network" | "store";
  status: string;
  courier_name?: string | null;
  courier_code?: string | null;
  courier_lat?: number | null;
  courier_lng?: number | null;
  courier_location_updated_at?: string | null;
};

export default function PartnerCourierControls({ requestId, storeId }: { requestId: string; storeId: string }) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [saving, setSaving] = useState(false);
  const autoRequestedRef = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("partner_courier_command" as never, { p_action: "dashboard", p_payload: {} } as never);
    if (error) return;
    const d = (data ?? {}) as { couriers?: Courier[]; jobs?: Job[] };
    setCouriers((d.couriers ?? []).filter((item) => item.store_id === storeId));
    setJobs(d.jobs ?? []);
  }, [storeId]);

  useEffect(() => {
    void load();
    const channel = supabase.channel("partner-courier-controls")
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_jobs" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_locations" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const current = jobs.find((job) => job.request_id === requestId && job.status !== "cancelled");

  useEffect(() => {
    if (current || autoRequestedRef.current) return;
    autoRequestedRef.current = true;
    void supabase.rpc("partner_courier_command" as never, {
      p_action: "request_network",
      p_payload: { request_id: requestId },
    } as never).then(({ error }) => {
      if (error) {
        autoRequestedRef.current = false;
        toast.error("Não foi possível iniciar a busca automática por entregador.");
        return;
      }
      void load();
    });
  }, [current, requestId, load]);

  const command = async (action: string, payload: Record<string, unknown>, success: string) => {
    setSaving(true);
    const { error } = await supabase.rpc("partner_courier_command" as never, { p_action: action, p_payload: payload } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(success);
    await load();
  };

  if (current) {
    const courier = couriers.find((item) => item.id === current.courier_id);
    return <div className="delivery-action-form">
      <p className="delivery-form-title">Entrega atribuída</p>
      <p className="delivery-hint">
        {current.source === "network" && !current.courier_id
          ? "Procurando entregador online próximo da loja."
          : current.courier_name && current.courier_code
            ? current.courier_name + " · " + current.courier_code
            : courier
              ? courier.full_name + " · " + courier.courier_code
              : current.courier_id
                ? "Entregador da rede atribuído."
                : "Aguardando aceite da rede."}
      </p>
      {current.courier_lat != null && current.courier_lng != null && (
        <a
          className="delivery-button delivery-button-outline"
          href={`https://www.google.com/maps?q=${current.courier_lat},${current.courier_lng}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Ver localização atual do entregador
        </a>
      )}
    </div>;
  }

  const available = couriers.filter((item) => item.status === "approved" && item.is_online);

  return <div className="delivery-action-form">
    <p className="delivery-form-title">Entrega própria ou rede de parceiros</p>
    <p className="delivery-hint">Selecione um motoqueiro próprio disponível ou aguarde o aceite de um entregador da rede. Não é necessário informar ID.</p>

    {available.length > 0 && <div className="delivery-form-grid">
      {available.map((courier) => <button
        key={courier.id}
        type="button"
        className="delivery-button delivery-button-outline"
        disabled={saving}
        onClick={() => void command("assign_store_courier", { request_id: requestId, courier_id: courier.id }, "Entregador da loja atribuído.")}
      ><Bike size={16} /> {courier.full_name} · {courier.courier_code}</button>)}
    </div>}

    {available.length === 0 && (
      <p className="delivery-hint">Nenhum motoqueiro próprio aprovado está online. A busca pela rede continua ativa.</p>
    )}

  </div>;
}
