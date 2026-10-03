import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bike, CheckCircle2, Clock3, MapPin, Navigation, Power, RefreshCw, Route, ShieldCheck, Store, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type CourierProfile = {
  id: string;
  courier_code: string;
  full_name: string;
  phone: string;
  status: "pending" | "approved" | "suspended";
  is_online: boolean;
  max_active_jobs: number;
};

type CourierJob = {
  id: string;
  request_id: string;
  status: "searching" | "assigned" | "picked_up" | "delivering" | "delivered" | "cancelled";
  source: "network" | "store";
  payout: number;
  store_name: string;
  store_lat: number;
  store_lng: number;
  customer_city: string;
  customer_street?: string | null;
  customer_number?: string | null;
  dropoff_lat?: number | null;
  dropoff_lng?: number | null;
  route_km?: number | null;
  eta_minutes?: number | null;
  items?: Array<{ name?: string; qty?: number }>;
};

type CourierPayout = {
  id: string;
  job_id: string;
  amount: number;
  status: "pending" | "paid" | "cancelled";
  created_at: string;
  paid_at?: string | null;
};

type Dashboard = {
  profile?: CourierProfile | null;
  links?: Array<{ store_id: string; store_name: string; status: string }>;
  jobs?: CourierJob[];
  payouts?: CourierPayout[];
  pending_payout_total?: number;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

export default function Motoqueiro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [saving, setSaving] = useState(false);
  const [registration, setRegistration] = useState({ full_name: "", phone: "", cpf: "", vehicle_type: "moto", vehicle_plate: "", cnh_number: "", cnh_category: "", cnh_expiry: "" });
  const [deliveryCode, setDeliveryCode] = useState<Record<string, string>>({});
  const [adult, setAdult] = useState<Record<string, boolean>>({});
  const watchRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setDashboard({});
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("courier_command" as never, { p_action: "dashboard", p_payload: {} } as never);
    if (error) {
      if (/Cadastre-se como entregador/i.test(error.message)) setDashboard({});
      else toast.error(error.message);
    } else setDashboard((data ?? {}) as Dashboard);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const channel = supabase.channel("courier-live-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_jobs" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const stopTracking = useCallback(() => {
    if (watchRef.current != null && "geolocation" in navigator) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
  }, []);

  const sendPosition = useCallback(async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    const { error } = await supabase.rpc("courier_command" as never, {
      p_action: "location",
      p_payload: { lat: latitude, lng: longitude, accuracy_m: accuracy, heading: heading ?? 0, speed_mps: speed ?? 0 },
    } as never);
    if (error && !/online/i.test(error.message)) console.warn(error.message);
  }, []);

  const startTracking = useCallback(() => {
    if (!("geolocation" in navigator)) return toast.error("Este aparelho não disponibilizou GPS para o navegador.");
    stopTracking();
    watchRef.current = navigator.geolocation.watchPosition(
      (position) => void sendPosition(position),
      () => toast.error("Permita o acesso à localização para receber corridas próximas."),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
  }, [sendPosition, stopTracking]);

  useEffect(() => {
    if (dashboard.profile?.is_online) startTracking(); else stopTracking();
    return stopTracking;
  }, [dashboard.profile?.is_online, startTracking, stopTracking]);

  const register = async () => {
    const cpfDigits = registration.cpf.replace(/\D/g, "");
    const cnhDigits = registration.cnh_number.replace(/\D/g, "");
    const motorized = registration.vehicle_type !== "bike";
    if (registration.full_name.trim().length < 3 || registration.phone.replace(/\D/g, "").length < 8) return toast.error("Informe nome e telefone válidos.");
    if (cpfDigits.length !== 11) return toast.error("Informe um CPF com 11 dígitos.");
    if (motorized && cnhDigits.length !== 11) return toast.error("Informe o número da CNH com 11 dígitos.");
    if (motorized && !registration.cnh_category) return toast.error("Informe a categoria da CNH.");
    if (motorized && !registration.cnh_expiry) return toast.error("Informe a validade da CNH.");
    if (motorized && !registration.vehicle_plate.trim()) return toast.error("Informe a placa do veículo.");
    setSaving(true);
    const { error } = await supabase.rpc("courier_command" as never, { p_action: "register", p_payload: registration } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Cadastro recebido. Você será avisado quando for aprovado.");
    navigate("/", { replace: true });
  };

  const command = async (action: string, payload: Record<string, unknown>, success: string) => {
    setSaving(true);
    const { data, error } = await supabase.rpc("courier_command" as never, { p_action: action, p_payload: payload } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    const result = data as { error?: string } | null;
    if (result?.error) return toast.error(result.error);
    toast.success(success);
    await load();
  };

  const profile = dashboard.profile;
  const jobs = dashboard.jobs ?? [];
  const available = jobs.filter((job) => job.status === "searching");
  const active = jobs.filter((job) => ["assigned", "picked_up", "delivering"].includes(job.status));
  const completed = jobs.filter((job) => job.status === "delivered");
  const payouts = dashboard.payouts ?? [];
  const pendingPayoutTotal = Number(dashboard.pending_payout_total ?? 0);
  const sessionValue = useMemo(() => [...active, ...completed].reduce((sum, job) => sum + Number(job.payout || 0), 0), [active, completed]);

  const routeUrl = (job: CourierJob) => {
    if (job.dropoff_lat == null || job.dropoff_lng == null) return null;
    const params = new URLSearchParams({ api: "1", origin: job.store_lat + "," + job.store_lng, destination: job.dropoff_lat + "," + job.dropoff_lng, travelmode: "driving" });
    return "https://www.google.com/maps/dir/?" + params.toString();
  };

  if (loading) return <main className="grid min-h-screen place-items-center bg-[#090909] text-zinc-300">Carregando área do entregador...</main>;

  if (!profile) return (
    <main className="min-h-screen bg-[#090909] text-white">
      <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-12 md:grid-cols-2 lg:px-8">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-yellow-300"><Bike className="h-4 w-4" /> Rede de entregadores</span>
          <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight sm:text-6xl">Já está na rua? <span className="text-yellow-400">Faça o trajeto render.</span></h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">Entre na rede, receba oportunidades perto de você e escolha corridas compatíveis com a sua rota.</p>
          <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-400">
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yellow-300" /> Cadastro com aprovação</span>
            <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-yellow-300" /> GPS durante a operação</span>
            <span className="inline-flex items-center gap-2"><WalletCards className="h-4 w-4 text-yellow-300" /> Valor visível por corrida</span>
          </div>
          <p className="mt-6 text-sm text-zinc-500">Ainda não está logado? <Link className="text-yellow-300 underline" to="/auth?next=%2Fmotoqueiro">Entrar ou criar conta</Link></p>
        </div>
        <Card className="border-white/10 bg-[#101214] p-5 text-white">
          <h2 className="text-xl font-black">Cadastrar como entregador</h2>
          <p className="mt-1 text-sm text-zinc-400">Seu ID profissional é gerado automaticamente após o cadastro.</p>
          <div className="mt-5 grid gap-3">
            <Input className="border-white/10 bg-black/30" placeholder="Nome completo" value={registration.full_name} onChange={(e) => setRegistration({ ...registration, full_name: e.target.value })} />
            <Input className="border-white/10 bg-black/30" placeholder="Telefone" value={registration.phone} onChange={(e) => setRegistration({ ...registration, phone: e.target.value })} />
            <Input inputMode="numeric" maxLength={14} className="border-white/10 bg-black/30" placeholder="CPF — 11 dígitos" value={registration.cpf} onChange={(e) => setRegistration({ ...registration, cpf: e.target.value })} />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <select className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm" value={registration.vehicle_type} onChange={(e) => setRegistration({ ...registration, vehicle_type: e.target.value })}>
                <option value="moto">Moto</option>
                <option value="bike">Bicicleta</option>
                <option value="carro">Carro</option>
                <option value="utilitario">Utilitário / Fiorino</option>
                <option value="caminhao">Caminhão leve</option>
                <option value="outro">Outro</option>
              </select>
              {registration.vehicle_type !== "bike" && <Input className="border-white/10 bg-black/30 uppercase" placeholder="Placa do veículo" value={registration.vehicle_plate} onChange={(e) => setRegistration({ ...registration, vehicle_plate: e.target.value.toUpperCase() })} />}
            </div>
            {registration.vehicle_type !== "bike" && <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.04] p-3">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-yellow-300">Habilitação do condutor</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <Input inputMode="numeric" maxLength={14} className="border-white/10 bg-black/30" placeholder="Número da CNH" value={registration.cnh_number} onChange={(e) => setRegistration({ ...registration, cnh_number: e.target.value })} />
                <select className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm" value={registration.cnh_category} onChange={(e) => setRegistration({ ...registration, cnh_category: e.target.value })}>
                  <option value="">Categoria CNH</option>
                  <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="AC">AC</option><option value="AD">AD</option><option value="AE">AE</option>
                </select>
                <Input type="date" className="border-white/10 bg-black/30" value={registration.cnh_expiry} onChange={(e) => setRegistration({ ...registration, cnh_expiry: e.target.value })} aria-label="Validade da CNH" />
              </div>
            </div>}
            <Button disabled={saving} onClick={() => void register()} className="bg-yellow-400 font-black text-black hover:bg-yellow-300">{saving ? "Enviando..." : "Quero trabalhar na rede"}</Button>
          </div>
        </Card>
      </section>
    </main>
  );

  return (
    <main className="min-h-screen bg-[#090909] px-4 py-5 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#101214] p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Entregador profissional</p>
            <h1 className="text-xl font-black">{profile.full_name} · {profile.courier_code}</h1>
            <p className="text-xs text-zinc-500">Status: {profile.status === "approved" ? "Aprovado" : profile.status === "pending" ? "Em análise" : "Suspenso"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" className="border-white/10" onClick={() => void load()}><RefreshCw className="h-4 w-4" /></Button>
            <Button disabled={saving || profile.status !== "approved"} onClick={() => void command("toggle_online", { online: !profile.is_online }, profile.is_online ? "Você ficou offline." : "Você está online e pode receber corridas.")} className={profile.is_online ? "bg-emerald-500 font-black text-black hover:bg-emerald-400" : "bg-zinc-800 font-black text-zinc-200 hover:bg-zinc-700"}>
              <Power className="h-4 w-4" /> {profile.is_online ? "Online" : "Offline"}
            </Button>
          </div>
        </header>

        {profile.status !== "approved" && <Card className="border-amber-400/20 bg-amber-400/[0.06] p-4 text-amber-100"><Clock3 className="mb-2 h-5 w-5" /><strong>Cadastro em análise.</strong><p className="mt-1 text-sm text-amber-100/70">O botão Online é liberado depois da aprovação administrativa.</p></Card>}

        <section className="grid gap-3 sm:grid-cols-4">
          <Card className="border-white/10 bg-[#101214] p-4 text-white"><p className="text-xs text-zinc-500">Disponibilidade</p><p className="mt-1 text-xl font-black">{profile.is_online ? "Online" : "Offline"}</p></Card>
          <Card className="border-white/10 bg-[#101214] p-4 text-white"><p className="text-xs text-zinc-500">Entregas ativas</p><p className="mt-1 text-xl font-black">{active.length}/{profile.max_active_jobs}</p></Card>
          <Card className="border-white/10 bg-[#101214] p-4 text-white"><p className="text-xs text-zinc-500">Oportunidades</p><p className="mt-1 text-xl font-black">{available.length}</p></Card>
          <Card className="border-white/10 bg-[#101214] p-4 text-white"><p className="text-xs text-zinc-500">A receber</p><p className="mt-1 text-xl font-black text-yellow-400">{money(pendingPayoutTotal)}</p><p className="mt-1 text-[10px] text-zinc-600">Corridas concluídas aguardando repasse</p></Card>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="border-white/10 bg-[#101214] p-4 text-white">
            <div className="flex items-center justify-between"><div><h2 className="font-black">Corridas disponíveis</h2><p className="text-xs text-zinc-500">Apenas pedidos pagos e próximos da sua localização recente.</p></div><MapPin className="h-5 w-5 text-yellow-300" /></div>
            <div className="mt-4 space-y-3">
              {available.length === 0 && <p className="rounded-xl border border-white/10 p-4 text-sm text-zinc-500">{profile.is_online ? "Nenhuma oportunidade próxima neste momento." : "Fique online para receber oportunidades próximas."}</p>}
              {available.map((job) => <article key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div><p className="text-xs text-zinc-500">{job.store_name}</p><p className="font-black">{job.customer_city}</p><p className="mt-1 text-xs text-zinc-400">{job.route_km ? Number(job.route_km).toFixed(1) + " km" : "Distância do pedido"}{job.eta_minutes ? " · ~" + job.eta_minutes + " min" : ""}</p></div>
                  <strong className="text-xl text-yellow-400">{money(Number(job.payout))}</strong>
                </div>
                <Button disabled={saving || active.length >= profile.max_active_jobs} onClick={() => void command("accept_job", { job_id: job.id }, "Corrida aceita. Agora siga até a loja.")} className="mt-3 w-full bg-yellow-400 font-black text-black hover:bg-yellow-300">Aceitar corrida</Button>
              </article>)}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="border-white/10 bg-[#101214] p-4 text-white">
              <h2 className="font-black">Minhas entregas</h2>
              <div className="mt-3 space-y-3">
                {active.length === 0 && <p className="text-sm text-zinc-500">Nenhuma entrega ativa.</p>}
                {active.map((job) => {
                  const url = routeUrl(job);
                  return <article key={job.id} className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3">
                    <div className="flex items-center gap-2"><Route className="h-4 w-4 text-emerald-300" /><strong className="text-sm">{job.store_name} → {job.customer_city}</strong></div>
                    <p className="mt-1 text-xs text-zinc-500">Status: {job.status === "assigned" ? "Ir buscar" : job.status === "picked_up" ? "Produto retirado" : "Em entrega"}</p>
                    {job.status === "assigned" && <Button disabled={saving} className="mt-3 w-full bg-yellow-400 font-black text-black hover:bg-yellow-300" onClick={() => void command("pickup_job", { job_id: job.id }, "Retirada confirmada. Pedido saiu para entrega.")}>Confirmar retirada</Button>}
                    {job.status !== "assigned" && url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md border border-white/10 text-sm font-bold"><Navigation className="h-4 w-4" /> Abrir rota no GPS</a>}
                    {job.status !== "assigned" && <div className="mt-3 grid gap-2">
                      <Input className="border-white/10 bg-black/30 uppercase" maxLength={8} placeholder="Código do cliente" value={deliveryCode[job.id] ?? ""} onChange={(e) => setDeliveryCode({ ...deliveryCode, [job.id]: e.target.value.toUpperCase() })} />
                      <label className="flex items-center gap-2 text-xs text-zinc-300"><input type="checkbox" checked={adult[job.id] ?? false} onChange={(e) => setAdult({ ...adult, [job.id]: e.target.checked })} /> Maioridade do recebedor conferida</label>
                      <Button disabled={saving || (deliveryCode[job.id] ?? "").length !== 8 || !adult[job.id]} onClick={() => void command("deliver_job", { job_id: job.id, code: deliveryCode[job.id], adult_verified: adult[job.id] }, "Entrega concluída.")} className="bg-emerald-500 font-black text-black hover:bg-emerald-400"><CheckCircle2 className="h-4 w-4" /> Concluir entrega</Button>
                    </div>}
                  </article>;
                })}
              </div>
            </Card>

            <Card className="border-white/10 bg-[#101214] p-4 text-white">
              <div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-yellow-300" /><strong className="text-sm">Repasses</strong></div>
              <div className="mt-3 space-y-2">
                {payouts.length === 0 && <p className="text-xs text-zinc-500">Nenhum repasse registrado ainda.</p>}
                {payouts.slice(0, 8).map((payout) => <div key={payout.id} className="flex items-center justify-between gap-3 rounded-lg border border-white/10 px-3 py-2">
                  <div>
                    <p className="text-xs font-bold">{money(Number(payout.amount))}</p>
                    <p className="text-[10px] text-zinc-500">{new Date(payout.created_at).toLocaleDateString("pt-BR")}</p>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-black ${payout.status === "paid" ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{payout.status === "paid" ? "Pago" : "Pendente"}</span>
                </div>)}
              </div>
            </Card>

            <Card className="border-white/10 bg-[#101214] p-4 text-white">
              <div className="flex items-center gap-2"><Store className="h-4 w-4 text-yellow-300" /><strong className="text-sm">Lojas vinculadas</strong></div>
              <div className="mt-2 space-y-1 text-xs text-zinc-400">{(dashboard.links ?? []).length ? (dashboard.links ?? []).map((link) => <p key={link.store_id}>{link.store_name}</p>) : <p>Você também pode trabalhar para toda a rede sem vínculo fixo.</p>}</div>
            </Card>
          </div>
        </section>
      </div>
    </main>
  );
}
