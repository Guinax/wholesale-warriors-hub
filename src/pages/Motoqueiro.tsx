import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bike, Camera, CheckCircle2, Clock3, MapPin, Navigation, Power, RefreshCw, Route, ShieldCheck, Store, WalletCards } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import CourierMap, { type CourierMapPoint } from "@/components/courier/CourierMap";

type CourierProfile = {
  id: string;
  courier_code: string;
  full_name: string;
  phone: string;
  status: "pending" | "approved" | "suspended";
  is_online: boolean;
  max_active_jobs: number;
  cpf?: string | null;
  vehicle_type?: string | null;
  vehicle_plate?: string | null;
  cnh_number?: string | null;
  cnh_category?: string | null;
  cnh_expiry?: string | null;
  phone_verified_at?: string | null;
  photo_url?: string | null;
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
  paid_amount: number;
  status: "pending" | "partial" | "paid" | "cancelled";
  created_at: string;
  paid_at?: string | null;
};

type CourierPayoutAccount = {
  courier_id: string;
  pix_key_type: "cpf" | "cnpj" | "email" | "phone" | "random";
  pix_key: string;
  holder_name: string;
  holder_document: string;
};

type CourierWalletPayment = {
  id: string;
  courier_id: string;
  amount: number;
  receipt_url: string;
  receipt_reference?: string | null;
  paid_at: string;
};

type Dashboard = {
  profile?: CourierProfile | null;
  links?: Array<{ store_id: string; store_name: string; status: string }>;
  jobs?: CourierJob[];
  payouts?: CourierPayout[];
  pending_payout_total?: number;
};

const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const normalizeWhatsAppPhone = (value: string) => {
  const raw = value.trim();
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+") && digits.length >= 10 && digits.length <= 15) return "+" + digits;
  if (digits.startsWith("55") && digits.length === 13) return "+" + digits;
  if (digits.length === 11) return "+55" + digits;
  return null;
};

export default function Motoqueiro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [payoutAccount, setPayoutAccount] = useState<CourierPayoutAccount | null>(null);
  const [walletPayments, setWalletPayments] = useState<CourierWalletPayment[]>([]);
  const [pixDraft, setPixDraft] = useState({ pix_key_type: "cpf", pix_key: "", holder_name: "", holder_document: "" });
  const [registration, setRegistration] = useState({ full_name: "", phone: "", cpf: "", vehicle_type: "moto", vehicle_plate: "", cnh_number: "", cnh_category: "", cnh_expiry: "" });
  const [deliveryCode, setDeliveryCode] = useState<Record<string, string>>({});
  const [adult, setAdult] = useState<Record<string, boolean>>({});
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"inicio" | "entregas" | "carteira" | "perfil">("inicio");
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const watchRef = useRef<number | null>(null);
  const lastLocationRefreshRef = useRef(0);

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setDashboard({});
      setLoading(false);
      return;
    }
    const { data, error } = await supabase.rpc("courier_command" as never, { p_action: "dashboard", p_payload: {} } as never);
    if (error) {
      if (/Cadastre-se como entregador/i.test(error.message)) {
        setDashboard({});
        setPayoutAccount(null);
        setWalletPayments([]);
      } else toast.error(error.message);
    } else {
      const next = (data ?? {}) as Dashboard;
      const profileId = next.profile?.id;
      if (profileId) {
        const [payoutResult, accountResult, paymentResult] = await Promise.all([
          supabase.from("courier_payouts" as never)
            .select("id,job_id,amount,paid_amount,status,created_at,paid_at")
            .eq("courier_id", profileId)
            .order("created_at", { ascending: false }),
          supabase.from("courier_payout_accounts" as never)
            .select("courier_id,pix_key_type,pix_key,holder_name,holder_document")
            .eq("courier_id", profileId)
            .maybeSingle(),
          supabase.from("courier_wallet_payments" as never)
            .select("id,courier_id,amount,receipt_url,receipt_reference,paid_at")
            .eq("courier_id", profileId)
            .order("paid_at", { ascending: false }),
        ]);

        const payoutRows = (payoutResult.data ?? []) as unknown as CourierPayout[];
        const balance = payoutRows
          .filter((p) => p.status !== "cancelled")
          .reduce((sum, p) => sum + Math.max(0, Number(p.amount || 0) - Number(p.paid_amount || 0)), 0);
        setDashboard({ ...next, payouts: payoutRows, pending_payout_total: balance });

        const account = accountResult.data as unknown as CourierPayoutAccount | null;
        setPayoutAccount(account);
        setPixDraft(account ? {
          pix_key_type: account.pix_key_type,
          pix_key: account.pix_key,
          holder_name: account.holder_name,
          holder_document: account.holder_document,
        } : { pix_key_type: "cpf", pix_key: "", holder_name: "", holder_document: "" });
        setWalletPayments((paymentResult.data ?? []) as unknown as CourierWalletPayment[]);
      } else {
        setDashboard(next);
        setPayoutAccount(null);
        setWalletPayments([]);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    const p = dashboard.profile;
    if (!p) return;
    setRegistration((current) => ({
      ...current,
      cpf: p.cpf ?? current.cpf,
      vehicle_type: p.vehicle_type ?? current.vehicle_type,
      vehicle_plate: p.vehicle_plate ?? current.vehicle_plate,
      cnh_number: p.cnh_number ?? current.cnh_number,
      cnh_category: p.cnh_category ?? current.cnh_category,
      cnh_expiry: p.cnh_expiry ?? current.cnh_expiry,
    }));
  }, [dashboard.profile]);

  useEffect(() => {
    const channel = supabase.channel("courier-live-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_jobs" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_payouts" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_wallet_payments" }, () => void load())
      .on("postgres_changes", { event: "*", schema: "public", table: "courier_payout_accounts" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [load]);

  const stopTracking = useCallback(() => {
    if (watchRef.current != null && "geolocation" in navigator) navigator.geolocation.clearWatch(watchRef.current);
    watchRef.current = null;
  }, []);

  const sendPosition = useCallback(async (position: GeolocationPosition) => {
    const { latitude, longitude, accuracy, heading, speed } = position.coords;
    setCurrentPosition({ lat: latitude, lng: longitude });
    const { error } = await supabase.rpc("courier_command" as never, {
      p_action: "location",
      p_payload: { lat: latitude, lng: longitude, accuracy_m: accuracy, heading: heading ?? 0, speed_mps: speed ?? 0 },
    } as never);
    if (error && !/online/i.test(error.message)) console.warn(error.message);
    if (!error && Date.now() - lastLocationRefreshRef.current > 15000) {
      lastLocationRefreshRef.current = Date.now();
      void load();
    }
  }, [load]);

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
    const whatsappPhone = normalizeWhatsAppPhone(registration.phone);
    if (registration.full_name.trim().length < 3 || !whatsappPhone) return toast.error("Informe nome e celular com DDD válidos.");
    if (cpfDigits.length !== 11) return toast.error("Informe um CPF com 11 dígitos.");
    if (motorized && cnhDigits.length !== 11) return toast.error("Informe o número da CNH com 11 dígitos.");
    if (motorized && !registration.cnh_category) return toast.error("Informe a categoria da CNH.");
    if (motorized && !registration.cnh_expiry) return toast.error("Informe a validade da CNH.");
    if (motorized && !registration.vehicle_plate.trim()) return toast.error("Informe a placa do veículo.");

    const payload = { ...registration, phone: whatsappPhone };
    setSaving(true);
    const { error } = await supabase.rpc("courier_command" as never, { p_action: "register", p_payload: payload } as never);
    setSaving(false);
    if (error) return toast.error(error.message);

    setRegistration((current) => ({ ...current, phone: whatsappPhone }));
    await load();
    toast.success("Cadastro de entregador recebido com sucesso.");
    navigate("/motoqueiro", { replace: true });
  };

  const saveDocuments = async () => {
    const cpfDigits = registration.cpf.replace(/\D/g, "");
    const cnhDigits = registration.cnh_number.replace(/\D/g, "");
    const motorized = registration.vehicle_type !== "bike";
    if (cpfDigits.length !== 11) return toast.error("Informe um CPF com 11 dígitos.");
    if (motorized && cnhDigits.length !== 11) return toast.error("Informe o número da CNH com 11 dígitos.");
    if (motorized && !registration.cnh_category) return toast.error("Informe a categoria da CNH.");
    if (motorized && !registration.cnh_expiry) return toast.error("Informe a validade da CNH.");
    if (motorized && !registration.vehicle_plate.trim()) return toast.error("Informe a placa do veículo.");
    await command("update_documents", registration, "Documentos atualizados. Seu cadastro continua em análise.");
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

  const updateProfilePhoto = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return toast.error("Escolha uma imagem válida.");
    if (file.size > 5 * 1024 * 1024) return toast.error("A foto deve ter no máximo 5 MB.");

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
    setUploadingPhoto(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Faça login para alterar sua foto.");

      const objectPath = `couriers/${auth.user.id}/profile-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("media")
        .upload(objectPath, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("media").getPublicUrl(objectPath);
      const photoUrl = publicData.publicUrl;
      const { error: saveError } = await supabase.rpc("courier_update_photo" as never, { p_photo_url: photoUrl } as never);
      if (saveError) {
        await supabase.storage.from("media").remove([objectPath]);
        throw saveError;
      }

      await load();
      toast.success("Foto de perfil atualizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível atualizar a foto.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const savePayoutAccount = async () => {
    const profileId = dashboard.profile?.id;
    if (!profileId) return toast.error("Perfil de entregador não encontrado.");
    const document = pixDraft.holder_document.replace(/\D/g, "");
    if (!pixDraft.pix_key.trim() || pixDraft.holder_name.trim().length < 3 || ![11,14].includes(document.length)) {
      return toast.error("Confira a chave PIX, titular e CPF/CNPJ.");
    }

    setSaving(true);
    const { error } = await supabase.from("courier_payout_accounts" as never).upsert({
      courier_id: profileId,
      pix_key_type: pixDraft.pix_key_type,
      pix_key: pixDraft.pix_key.trim(),
      holder_name: pixDraft.holder_name.trim(),
      holder_document: document,
      updated_at: new Date().toISOString(),
    } as never, { onConflict: "courier_id" });
    setSaving(false);

    if (error) return toast.error(error.message);
    toast.success("Conta PIX salva na carteira.");
    await load();
  };

  const profile = dashboard.profile;
  const jobs = dashboard.jobs ?? [];
  const available = jobs.filter((job) => job.status === "searching");
  const active = jobs.filter((job) => ["assigned", "picked_up", "delivering"].includes(job.status));
  const completed = jobs.filter((job) => job.status === "delivered");
  const payouts = dashboard.payouts ?? [];
  const pendingPayoutTotal = payouts
    .filter((payout) => payout.status !== "cancelled")
    .reduce((sum, payout) => sum + Math.max(0, Number(payout.amount || 0) - Number(payout.paid_amount || 0)), 0);
  const paidPayoutTotal = payouts
    .filter((payout) => payout.status !== "cancelled")
    .reduce((sum, payout) => sum + Number(payout.paid_amount || 0), 0);
  const sessionValue = useMemo(() => [...active, ...completed].reduce((sum, job) => sum + Number(job.payout || 0), 0), [active, completed]);

  const mapPoints = useMemo<CourierMapPoint[]>(() => {
    const points: CourierMapPoint[] = [];
    if (currentPosition) {
      points.push({ id: "courier", lat: currentPosition.lat, lng: currentPosition.lng, label: "Sua posição", kind: "courier" });
    }

    for (const job of available) {
      if (Number.isFinite(Number(job.store_lat)) && Number.isFinite(Number(job.store_lng))) {
        points.push({
          id: job.id,
          lat: Number(job.store_lat),
          lng: Number(job.store_lng),
          label: `${job.store_name} · ${job.customer_city} · ${money(Number(job.payout))}`,
          kind: "opportunity",
        });
      }
    }

    for (const job of active) {
      if (Number.isFinite(Number(job.store_lat)) && Number.isFinite(Number(job.store_lng))) {
        points.push({
          id: `${job.id}:pickup`,
          lat: Number(job.store_lat),
          lng: Number(job.store_lng),
          label: `Retirada · ${job.store_name}`,
          kind: "pickup",
        });
      }
      if (job.dropoff_lat != null && job.dropoff_lng != null) {
        points.push({
          id: `${job.id}:dropoff`,
          lat: Number(job.dropoff_lat),
          lng: Number(job.dropoff_lng),
          label: `Entrega · ${job.customer_street ?? job.customer_city}${job.customer_number ? ", " + job.customer_number : ""}`,
          kind: "dropoff",
        });
      }
    }

    return points;
  }, [active, available, currentPosition]);

  const selectedMapId = selectedJobId
    ? mapPoints.find((point) => point.id === selectedJobId)?.id
      ?? mapPoints.find((point) => point.id.startsWith(selectedJobId + ":"))?.id
      ?? null
    : null;

  const routeUrl = (job: CourierJob) => {
    if (job.status === "assigned") {
      const params = new URLSearchParams({ api: "1", destination: job.store_lat + "," + job.store_lng, travelmode: "driving" });
      return "https://www.google.com/maps/dir/?" + params.toString();
    }
    if (job.status !== "delivering" || job.dropoff_lat == null || job.dropoff_lng == null) return null;
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
          <p className="mt-1 text-sm text-zinc-400">Preencha seus dados para entrar na rede. Ao concluir, você entra direto na sua conta enquanto o cadastro segue para análise administrativa.</p>
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
            <Button disabled={saving} onClick={() => void register()} className="bg-yellow-400 font-black text-black hover:bg-yellow-300">{saving ? "Cadastrando..." : "Cadastrar como entregador"}</Button>
          </div>
        </Card>
      </section>
    </main>
  );

  const primaryActive = active[0] ?? null;
  const selectedOffer = available.find((job) => job.id === selectedJobId) ?? available[0] ?? null;

  const progressState = (job: CourierJob) => {
    if (job.status === "assigned") return 1;
    if (job.status === "picked_up") return 2;
    if (job.status === "delivering") return 3;
    if (job.status === "delivered") return 4;
    return 0;
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2a2108_0%,#0b0b0b_28%,#050505_70%)] pb-24 text-white">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-5 lg:px-7">
        <header className="overflow-hidden rounded-[28px] border border-yellow-400/20 bg-black/80 shadow-[0_0_45px_rgba(234,179,8,0.08)] backdrop-blur">
          <div className="h-1 bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />
          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-4">
              <label className="group relative h-16 w-16 shrink-0 cursor-pointer overflow-hidden rounded-2xl border border-yellow-400/40 bg-gradient-to-br from-yellow-300/20 via-yellow-500/5 to-transparent shadow-[0_0_28px_rgba(250,204,21,0.18)]" title="Alterar foto do perfil">
                {profile.photo_url ? (
                  <img src={profile.photo_url} alt={`Foto de ${profile.full_name}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="grid h-full w-full place-items-center"><Bike className="h-8 w-8 text-yellow-300" /></span>
                )}
                <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-1 bg-black/70 py-1 text-[9px] font-black uppercase text-yellow-300 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
                  <Camera className="h-3 w-3" /> {uploadingPhoto ? "Enviando" : "Foto"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={uploadingPhoto}
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    e.currentTarget.value = "";
                    void updateProfilePhoto(file);
                  }}
                />
              </label>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.26em] text-yellow-400/70">Mansão Maromba • Entregador</p>
                <h1 className="truncate text-2xl font-black sm:text-3xl">{profile.full_name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                  <span>{profile.courier_code}</span><span>•</span>
                  <span>{profile.status === "approved" ? "Cadastro aprovado" : profile.status === "pending" ? "Cadastro em análise" : "Cadastro suspenso"}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-12 w-12 rounded-2xl border-white/10 bg-white/[0.03] hover:bg-white/[0.08]" onClick={() => void load()}><RefreshCw className="h-5 w-5" /></Button>
              <Button disabled={saving || profile.status !== "approved"} onClick={() => void command("toggle_online", { online: !profile.is_online }, profile.is_online ? "Você ficou offline." : "Você está online e pode receber corridas.")} className={`h-12 min-w-40 rounded-2xl border px-5 text-base font-black shadow-lg transition ${profile.is_online ? "border-emerald-300/40 bg-emerald-500 text-black shadow-emerald-500/20 hover:bg-emerald-400" : "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"}`}>
                <Power className="mr-2 h-5 w-5" /> {profile.is_online ? "ONLINE" : "OFFLINE"}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
            {[
              ["Ganhos no painel", money(sessionValue)],
              ["A receber", money(pendingPayoutTotal)],
              ["Entregas", String(completed.length)],
              ["Disponíveis", String(available.length)],
            ].map(([label, value]) => (
              <div key={label} className="bg-black/85 px-4 py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p>
                <p className="mt-1 text-xl font-black text-yellow-300">{value}</p>
              </div>
            ))}
          </div>
        </header>

        {profile.status !== "approved" && <Card className="mt-4 border-amber-400/25 bg-amber-400/[0.07] p-4 text-amber-100"><div className="flex items-start gap-3"><Clock3 className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Cadastro em análise.</strong><p className="mt-1 text-sm text-amber-100/70">Você pode revisar seus documentos abaixo. As corridas serão liberadas após a aprovação.</p></div></div></Card>}

        <section id="inicio" className={activeTab==="inicio" ? "mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.65fr]" : activeTab==="carteira" ? "mt-4 block" : "hidden"}>
          <Card className={activeTab==="inicio" ? "overflow-hidden rounded-[28px] border-yellow-400/15 bg-[#0b0b0b] p-0 text-white shadow-[0_0_35px_rgba(234,179,8,0.06)]" : "hidden"}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-yellow-400/[0.08] to-transparent p-4 sm:p-5">
              <div><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-yellow-300" /><h2 className="text-lg font-black">Mapa operacional</h2></div><p className="mt-1 text-xs text-zinc-500">{profile.is_online ? "Sua posição, coletas e oportunidades em tempo real." : "Fique online para compartilhar sua posição e receber corridas."}</p></div>
              <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.06] px-3 py-2 text-right"><p className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Ativas</p><p className="text-lg font-black text-yellow-300">{active.length}/{profile.max_active_jobs}</p></div>
            </div>
            <div className="relative min-h-[390px]">
              <CourierMap points={mapPoints} selectedId={selectedMapId} onSelect={(id) => setSelectedJobId(id.split(":")[0] === "courier" ? null : id.split(":")[0])} />
              {selectedOffer && <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[400]"><div className="pointer-events-auto rounded-2xl border border-yellow-400/30 bg-black/95 p-4 shadow-2xl backdrop-blur">
                <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">Corrida disponível</p><p className="mt-1 font-black">{selectedOffer.store_name} → {selectedOffer.customer_city}</p><p className="mt-1 text-xs text-zinc-400">{selectedOffer.route_km ? Number(selectedOffer.route_km).toFixed(1) + " km" : "Distância calculada na operação"}{selectedOffer.eta_minutes ? " • ~" + selectedOffer.eta_minutes + " min" : ""}</p></div><strong className="text-2xl text-yellow-300">{money(Number(selectedOffer.payout))}</strong></div>
                <Button disabled={saving || active.length >= profile.max_active_jobs} onClick={() => void command("accept_job", { job_id: selectedOffer.id }, "Corrida aceita. Agora siga até a loja.")} className="mt-3 h-12 w-full rounded-xl bg-yellow-400 font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.2)] hover:bg-yellow-300">ACEITAR CORRIDA</Button>
              </div></div>}
            </div>
          </Card>

          <div className={activeTab==="inicio" || activeTab==="carteira" ? "space-y-4" : "hidden"}>
            <Card className={activeTab==="inicio" ? "rounded-[28px] border-yellow-400/15 bg-black/80 p-5 text-white" : "hidden"}>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400/70">Operação agora</p><h2 className="mt-2 text-2xl font-black">{primaryActive ? "Entrega em andamento" : "Pronto para rodar"}</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{primaryActive ? "Siga a sequência operacional abaixo. O destino final permanece protegido até o início do percurso." : profile.is_online ? "Você está online. Assim que uma corrida compatível aparecer, ela será destacada no mapa." : "Ative o modo online para começar a receber oportunidades próximas."}</p>
              {!primaryActive && <div className="mt-5 grid place-items-center rounded-2xl border border-dashed border-yellow-400/20 bg-yellow-400/[0.03] p-8 text-center"><Bike className="h-10 w-10 text-yellow-300/70" /><p className="mt-3 text-sm font-bold text-zinc-300">Nenhuma entrega ativa</p></div>}
            </Card>
            <Card id="carteira" className={activeTab==="carteira" ? "rounded-[28px] border-white/10 bg-[#0b0b0b] p-5 text-white" : "hidden"}>
              <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-500">Carteira</p><h3 className="mt-1 font-black">Meus repasses</h3></div><WalletCards className="h-6 w-6 text-yellow-300" /></div>
              <div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.05] p-3"><p className="text-[10px] text-zinc-500">Saldo disponível</p><p className="mt-1 text-2xl font-black text-yellow-300">{money(pendingPayoutTotal)}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.02] p-3"><p className="text-[10px] text-zinc-500">Total recebido</p><p className="mt-1 text-2xl font-black text-emerald-300">{money(paidPayoutTotal)}</p></div></div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-xs font-black uppercase tracking-wider text-yellow-300">Conta PIX para receber</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <select className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm" value={pixDraft.pix_key_type} onChange={(e)=>setPixDraft({...pixDraft,pix_key_type:e.target.value as CourierPayoutAccount["pix_key_type"]})}>
                    <option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="phone">Telefone</option><option value="random">Aleatória</option>
                  </select>
                  <Input className="border-white/10 bg-black/30" placeholder="Chave PIX" value={pixDraft.pix_key} onChange={(e)=>setPixDraft({...pixDraft,pix_key:e.target.value})}/>
                  <Input className="border-white/10 bg-black/30" placeholder="Nome do titular" value={pixDraft.holder_name} onChange={(e)=>setPixDraft({...pixDraft,holder_name:e.target.value})}/>
                  <Input className="border-white/10 bg-black/30" placeholder="CPF/CNPJ do titular" value={pixDraft.holder_document} onChange={(e)=>setPixDraft({...pixDraft,holder_document:e.target.value})}/>
                </div>
                <Button disabled={saving} onClick={()=>void savePayoutAccount()} variant="outline" className="mt-3 border-yellow-400/30 bg-yellow-400/[0.04] text-yellow-200">{saving?"Salvando...":payoutAccount?"Atualizar conta PIX":"Salvar conta PIX"}</Button>
              </div>

              <div className="mt-4 space-y-2">
                {walletPayments.length===0&&<p className="text-xs text-zinc-500">Nenhum PIX recebido ainda. Seus ganhos continuarão acumulando.</p>}
                {walletPayments.slice(0,4).map((payment)=><div key={payment.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"><div><p className="text-sm font-black text-emerald-300">{money(Number(payment.amount))}</p><p className="text-[10px] text-zinc-500">{new Date(payment.paid_at).toLocaleString("pt-BR")}{payment.receipt_reference?` · ${payment.receipt_reference}`:""}</p></div><a href={payment.receipt_url} target="_blank" rel="noreferrer" className="text-[10px] font-black text-yellow-300 underline">COMPROVANTE</a></div>)}
              </div>
            </Card>
          </div>
        </section>

        <section id="entregas" className={activeTab==="entregas" ? "mt-4 space-y-4" : "hidden"}>
          <div className="flex items-end justify-between gap-4 px-1"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-yellow-400/70">Missões ativas</p><h2 className="mt-1 text-2xl font-black">Minhas entregas</h2></div><Route className="h-7 w-7 text-yellow-300" /></div>
          {active.length === 0 && <Card className="rounded-[28px] border-white/10 bg-black/60 p-6 text-center text-sm text-zinc-500">Nenhuma entrega ativa neste momento.</Card>}
          {active.map((job) => {
            const step = progressState(job);
            const url = routeUrl(job);
            const destinationVisible = job.status === "delivering" && !!job.customer_street;
            const steps = [{ label: "Aceita", done: step >= 1 },{ label: "Retirada", done: step >= 2 },{ label: "Em rota", done: step >= 3 },{ label: "Concluir", done: step >= 4 }];
            return <Card key={job.id} className="overflow-hidden rounded-[28px] border-yellow-400/20 bg-[#090909] p-0 text-white shadow-[0_0_40px_rgba(234,179,8,0.07)]">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-yellow-400/[0.08] via-transparent to-transparent p-5">
                <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">Entrega ativa</p><h3 className="mt-1 text-xl font-black">{job.store_name} → {job.customer_city}</h3><p className="mt-1 text-xs text-zinc-500">Corrida {job.id.slice(0,8).toUpperCase()} • {money(Number(job.payout))}</p></div>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1.5 text-xs font-black text-emerald-300">{job.status === "assigned" ? "IR À LOJA" : job.status === "picked_up" ? "RETIRADA FEITA" : "EM ROTA"}</span>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-4 gap-2">{steps.map((s, i) => <div key={s.label} className="relative text-center">{i < steps.length - 1 && <div className={`absolute left-[55%] top-4 h-0.5 w-[90%] ${step > i + 1 ? "bg-emerald-400" : "bg-white/10"}`} />}<div className={`relative mx-auto grid h-8 w-8 place-items-center rounded-full border text-xs font-black ${s.done ? "border-emerald-300/40 bg-emerald-500 text-black" : "border-white/15 bg-zinc-900 text-zinc-600"}`}>{s.done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}</div><p className={`mt-2 text-[10px] font-bold ${s.done ? "text-emerald-300" : "text-zinc-600"}`}>{s.label}</p></div>)}</div>

                {job.status === "assigned" && <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto]"><div className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"><div className="flex items-start gap-3"><Store className="mt-0.5 h-5 w-5 text-yellow-300" /><div><p className="text-xs font-black uppercase tracking-wider text-yellow-300">Coleta no comércio</p><p className="mt-1 font-black">{job.store_name}</p><p className="mt-1 text-xs text-zinc-500">Siga até a loja. O endereço do cliente permanece bloqueado.</p></div></div></div><div className="grid min-w-[240px] gap-2">{url && <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/[0.06] px-5 text-sm font-black text-yellow-300"><Navigation className="h-4 w-4" /> ABRIR ROTA PARA COLETA</a>}<Button disabled={saving} onClick={() => void command("pickup_job", { job_id: job.id }, "Retirada confirmada. Agora inicie o percurso.")} className="h-12 rounded-xl bg-yellow-400 font-black text-black hover:bg-yellow-300">CONFIRMAR RETIRADA</Button></div></div>}

                {job.status === "picked_up" && <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-4"><div className="flex items-start gap-3"><CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-300" /><div className="flex-1"><p className="font-black text-emerald-200">Produto retirado</p><p className="mt-1 text-sm text-zinc-400">O pedido está com você. Toque em <strong className="text-white">Iniciar percurso</strong> para liberar o endereço e a rota do cliente.</p></div></div><Button disabled={saving} className="mt-4 h-14 w-full rounded-xl bg-emerald-500 text-base font-black text-black shadow-[0_0_26px_rgba(16,185,129,0.18)] hover:bg-emerald-400" onClick={() => void command("start_delivery", { job_id: job.id }, "Percurso iniciado. Endereço de entrega liberado.")}><Navigation className="mr-2 h-5 w-5" /> INICIAR PERCURSO</Button></div>}

                {job.status === "delivering" && <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
                  <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.04] p-4"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400">Em rota para o cliente</p>{destinationVisible ? <><div className="mt-3 flex items-start gap-3"><MapPin className="mt-0.5 h-6 w-6 shrink-0 text-yellow-300" /><div><p className="text-lg font-black">{job.customer_street}, {job.customer_number ?? "s/n"}</p><p className="mt-1 text-sm text-zinc-400">{job.customer_city}</p></div></div><div className="mt-4 flex flex-wrap gap-4 text-xs text-zinc-400">{job.route_km && <span><strong className="text-white">{Number(job.route_km).toFixed(1)} km</strong> distância</span>}{job.eta_minutes && <span><strong className="text-white">~{job.eta_minutes} min</strong> estimado</span>}</div>{url && <a href={url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 font-black text-black shadow-[0_0_24px_rgba(250,204,21,0.22)] hover:bg-yellow-300"><Navigation className="h-5 w-5" /> ABRIR GOOGLE MAPS</a>}</> : <p className="mt-3 text-sm text-zinc-400">Destino sendo carregado com segurança. Atualize o painel se necessário.</p>}</div>
                  <div className="rounded-2xl border border-white/10 bg-black p-4"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-yellow-300" /><p className="font-black">Código de entrega</p></div><p className="mt-2 text-xs leading-5 text-zinc-500">Peça ao cliente o código impresso/gerado no pedido e confirme a maioridade quando aplicável.</p><Input className="mt-4 h-14 border-yellow-400/20 bg-white/[0.03] text-center text-xl font-black uppercase tracking-[0.22em]" maxLength={8} placeholder="8 DÍGITOS" value={deliveryCode[job.id] ?? ""} onChange={(e) => setDeliveryCode({ ...deliveryCode, [job.id]: e.target.value.toUpperCase() })} /><label className="mt-3 flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-zinc-300"><input className="mt-0.5" type="checkbox" checked={adult[job.id] ?? false} onChange={(e) => setAdult({ ...adult, [job.id]: e.target.checked })} /><span>Maioridade do recebedor conferida</span></label><Button disabled={saving || (deliveryCode[job.id] ?? "").length !== 8 || !adult[job.id]} onClick={() => void command("deliver_job", { job_id: job.id, code: deliveryCode[job.id], adult_verified: adult[job.id] }, "Entrega concluída.")} className="mt-3 h-14 w-full rounded-xl bg-emerald-500 text-base font-black text-black hover:bg-emerald-400"><CheckCircle2 className="mr-2 h-5 w-5" /> CONCLUIR ENTREGA</Button></div>
                </div>}
              </div>
            </Card>;
          })}
        </section>

        <section className={activeTab==="inicio" ? "mt-4 grid gap-4 lg:grid-cols-2" : "hidden"}>
          <Card className="rounded-[28px] border-white/10 bg-black/70 p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400/70">Oportunidades</p><h2 className="mt-1 text-xl font-black">Corridas disponíveis</h2></div><MapPin className="h-6 w-6 text-yellow-300" /></div><div className="mt-4 space-y-3">{available.length === 0 && <p className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-500">{profile.is_online ? "Nenhuma oportunidade próxima neste momento." : "Fique online para receber oportunidades próximas."}</p>}{available.map((job) => <button key={job.id} type="button" onClick={() => setSelectedJobId(job.id)} className={`w-full rounded-2xl border p-4 text-left transition ${selectedJobId === job.id ? "border-yellow-400/40 bg-yellow-400/[0.06]" : "border-white/10 bg-white/[0.02] hover:border-white/20"}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-zinc-500">{job.store_name}</p><p className="mt-1 font-black">{job.customer_city}</p><p className="mt-1 text-xs text-zinc-500">{job.route_km ? Number(job.route_km).toFixed(1) + " km" : "Distância calculada"}{job.eta_minutes ? " • ~" + job.eta_minutes + " min" : ""}</p></div><strong className="text-xl text-yellow-300">{money(Number(job.payout))}</strong></div></button>)}</div></Card>
          <Card className="rounded-[28px] border-white/10 bg-black/70 p-5 text-white"><div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-yellow-400/70">Rede Mansão Maromba</p><h2 className="mt-1 text-xl font-black">Lojas vinculadas</h2></div><Store className="h-6 w-6 text-yellow-300" /></div><div className="mt-4 grid gap-2">{(dashboard.links ?? []).length ? (dashboard.links ?? []).map((link) => <div key={link.store_id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm font-bold">{link.store_name}</div>) : <p className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-zinc-500">Você pode trabalhar para toda a rede mesmo sem vínculo fixo.</p>}</div></Card>
        </section>

        {activeTab==="perfil" && profile.status === "pending" && <Card id="perfil" className="mt-4 rounded-[28px] border-white/10 bg-black/70 p-5 text-white"><h2 className="text-xl font-black">Documentos do cadastro</h2><p className="mt-1 text-xs text-zinc-500">Complete ou corrija seus dados enquanto o cadastro estiver em análise.</p><div className="mt-4 grid gap-3"><Input inputMode="numeric" maxLength={14} className="border-white/10 bg-black/30" placeholder="CPF — 11 dígitos" value={registration.cpf} onChange={(e) => setRegistration({ ...registration, cpf: e.target.value })} /><div className="grid gap-3 sm:grid-cols-2"><select className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm" value={registration.vehicle_type} onChange={(e) => setRegistration({ ...registration, vehicle_type: e.target.value })}><option value="moto">Moto</option><option value="bike">Bicicleta</option><option value="carro">Carro</option><option value="utilitario">Utilitário / Fiorino</option><option value="caminhao">Caminhão leve</option><option value="outro">Outro</option></select>{registration.vehicle_type !== "bike" && <Input className="border-white/10 bg-black/30 uppercase" placeholder="Placa do veículo" value={registration.vehicle_plate} onChange={(e) => setRegistration({ ...registration, vehicle_plate: e.target.value.toUpperCase() })} />}</div>{registration.vehicle_type !== "bike" && <div className="grid gap-3 sm:grid-cols-3"><Input inputMode="numeric" maxLength={14} className="border-white/10 bg-black/30" placeholder="Número da CNH" value={registration.cnh_number} onChange={(e) => setRegistration({ ...registration, cnh_number: e.target.value })} /><select className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm" value={registration.cnh_category} onChange={(e) => setRegistration({ ...registration, cnh_category: e.target.value })}><option value="">Categoria CNH</option><option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="C">C</option><option value="D">D</option><option value="E">E</option><option value="AC">AC</option><option value="AD">AD</option><option value="AE">AE</option></select><Input type="date" className="border-white/10 bg-black/30" value={registration.cnh_expiry} onChange={(e) => setRegistration({ ...registration, cnh_expiry: e.target.value })} aria-label="Validade da CNH" /></div>}<Button disabled={saving} onClick={() => void saveDocuments()} className="bg-yellow-400 font-black text-black hover:bg-yellow-300">{saving ? "Salvando..." : "Salvar documentos"}</Button></div></Card>}
      </div>

      {activeTab==="perfil" && profile.status !== "pending" && <Card id="perfil" className="mt-4 rounded-[28px] border-white/10 bg-black/70 p-5 text-white">
        <div className="flex items-center gap-3"><ShieldCheck className="h-6 w-6 text-yellow-300"/><div><h2 className="text-xl font-black">Meu perfil</h2><p className="text-xs text-zinc-500">Cadastro e dados operacionais do entregador.</p></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3"><span className="text-zinc-500">Nome</span><p className="font-bold">{profile.full_name}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3"><span className="text-zinc-500">Código</span><p className="font-bold">{profile.courier_code}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3"><span className="text-zinc-500">Telefone</span><p className="font-bold">{profile.phone}</p></div>
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3"><span className="text-zinc-500">Veículo</span><p className="font-bold">{profile.vehicle_type || "Não informado"}{profile.vehicle_plate ? " · " + profile.vehicle_plate : ""}</p></div>
        </div>
      </Card>}

      <nav className="fixed inset-x-0 bottom-0 z-[600] border-t border-yellow-400/15 bg-black/95 px-3 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
          {([
            ["inicio","Início",MapPin],
            ["entregas","Entregas",Bike],
            ["carteira","Carteira",WalletCards],
            ["perfil","Perfil",ShieldCheck],
          ] as const).map(([tab,label,Icon])=><button key={tab} type="button" onClick={()=>{setActiveTab(tab);window.scrollTo({top:0,behavior:"auto"});}} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold ${activeTab===tab?"bg-yellow-400/10 text-yellow-300":"text-zinc-400 hover:text-yellow-300"}`}><Icon className="h-5 w-5"/>{label}</button>)}
        </div>
      </nav>
    </main>
  );
}
