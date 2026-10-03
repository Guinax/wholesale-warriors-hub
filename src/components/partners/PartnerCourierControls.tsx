import { useCallback, useEffect, useState } from "react";
import { Bike, Network, UserPlus } from "lucide-react";
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
};

export default function PartnerCourierControls({ requestId, storeId }: { requestId: string; storeId: string }) {
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [code, setCode] = useState("");
  const [saving, setSaving] = useState(false);

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
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const current = jobs.find((job) => job.request_id === requestId && job.status !== "cancelled");

  const linkCourier = async () => {
    if (code.trim().length < 4) return toast.error("Informe o ID do entregador.");
    setSaving(true);
    const { error } = await supabase.rpc("partner_link_courier_by_code" as never, { p_store_id: storeId, p_courier_code: code.trim().toUpperCase() } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    setCode("");
    toast.success("Entregador vinculado à loja.");
    await load();
  };

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
          : courier
            ? courier.full_name + " · " + courier.courier_code
            : current.courier_id
              ? "Entregador da rede atribuído."
              : "Aguardando aceite da rede."}
      </p>
    </div>;
  }

  const available = couriers.filter((item) => item.status === "approved" && item.is_online);

  return <div className="delivery-action-form">
    <p className="delivery-form-title">Escolher entrega</p>
    <p className="delivery-hint">Use um entregador da sua loja ou deixe a rede procurar alguém online perto de você.</p>

    {available.length > 0 && <div className="delivery-form-grid">
      {available.map((courier) => <button
        key={courier.id}
        type="button"
        className="delivery-button delivery-button-outline"
        disabled={saving}
        onClick={() => void command("assign_store_courier", { request_id: requestId, courier_id: courier.id }, "Entregador da loja atribuído.")}
      ><Bike size={16} /> {courier.full_name} · {courier.courier_code}</button>)}
    </div>}

    <button
      type="button"
      className="delivery-button delivery-button-primary"
      disabled={saving}
      onClick={() => void command("request_network", { request_id: requestId }, "Pedido enviado para a rede de entregadores.")}
    ><Network size={16} /> Chamar entregadores da rede</button>

    <div className="delivery-form-grid">
      <label>ID de um entregador para vincular à loja
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Ex.: MM-AB12CD34" />
      </label>
      <button type="button" className="delivery-button delivery-button-outline" disabled={saving} onClick={() => void linkCourier()}><UserPlus size={16} /> Vincular entregador</button>
    </div>
  </div>;
}
