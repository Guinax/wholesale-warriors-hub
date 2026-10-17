import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lookupCep, maskCepValue, onlyDigitsCep } from "@/lib/shipping";
import { toast } from "sonner";

type StoreSummary = { id: string; name: string; status: string };
type Draft = { name: string; document: string; phone: string; cep: string; address: string; city: string; state: string; lat: string; lng: string; radius_km: string; terms: boolean };
const initial: Draft = { name: "", document: "", phone: "", cep: "", address: "", city: "", state: "", lat: "", lng: "", radius_km: "15", terms: false };

export default function CadastroParceiro() {
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(initial);
  const [existing, setExisting] = useState<StoreSummary[]>([]);
  const [checking, setChecking] = useState(true);
  const [checkError, setCheckError] = useState("");
  const [saving, setSaving] = useState(false);
  const [findingCep, setFindingCep] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const update = (key: keyof Draft, value: string | boolean) => setDraft(current => ({ ...current, [key]: value }));

  const checkExisting = async () => {
    setChecking(true); setCheckError(""); setNeedsLogin(false);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) { setNeedsLogin(true); return; }
      const { data, error } = await supabase.from("partner_stores" as never).select("id,name,status").eq("owner_id", auth.user.id);
      if (!error) { setExisting((data ?? []) as StoreSummary[]); return; }
      const rpc = await supabase.rpc("partner_command" as never, { p_action: "dashboard", p_payload: {} } as never);
      if (rpc.error || !(rpc as { data?: unknown }).data) {
        setCheckError("Não foi possível verificar suas lojas. Tente novamente antes de enviar um cadastro.");
        return;
      }
      setExisting(((((rpc as { data?: { stores?: StoreSummary[] } }).data)?.stores) ?? []));
    } catch { setCheckError("Falha ao verificar cadastro. Confira sua conexão."); }
    finally { setChecking(false); }
  };
  useEffect(() => { void checkExisting(); }, []);

  const findCep = async () => {
    if (onlyDigitsCep(draft.cep).length !== 8) return toast.error("Informe um CEP válido.");
    setFindingCep(true);
    try {
      const info = await lookupCep(onlyDigitsCep(draft.cep));
      if (!info) return toast.error("CEP não encontrado.");
      if (info.latitude == null || info.longitude == null) return toast.error("CEP sem coordenadas; tente outro CEP.");
      setDraft(current => ({ ...current, cep: info.cep, address: [info.street, info.neighborhood].filter(Boolean).join(", ") || current.address, city: info.city, state: info.state, lat: String(info.latitude), lng: String(info.longitude) }));
      toast.success("Endereço localizado. Confira o número da loja.");
    } catch { toast.error("Não foi possível consultar o CEP."); }
    finally { setFindingCep(false); }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (checking || checkError || existing.length) return;
    const document = draft.document.replace(/\D/g, "");
    if (draft.name.trim().length < 2 || document.length !== 14 || draft.phone.trim().length < 8 ||
        onlyDigitsCep(draft.cep).length !== 8 || draft.address.trim().length < 5 || !draft.city || !draft.state) {
      return toast.error("Confira nome, CNPJ, telefone, CEP e endereço da loja.");
    }
    const lat = Number(draft.lat), lng = Number(draft.lng), radius = Number(draft.radius_km);
    if (!draft.lat || !draft.lng || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) return toast.error("Localize o CEP antes de enviar.");
    if (!Number.isFinite(radius) || radius < 1 || radius > 50) return toast.error("O raio deve estar entre 1 e 50 km.");
    if (!draft.terms) return toast.error("Aceite os termos de participação.");
    setSaving(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("Sua sessão expirou. Entre novamente.");
      const owned = await supabase.from("partner_stores" as never).select("id,name,status").eq("owner_id", auth.user.id);
      if (owned.error) throw new Error("Não foi possível confirmar seus cadastros. Tente novamente.");
      if (owned.data?.length) { setExisting(owned.data as StoreSummary[]); toast.info("Sua conta já possui loja cadastrada."); return; }
      const { error } = await supabase.rpc("partner_command" as never, {
        p_action: "register",
        p_payload: { ...draft, document, cep: onlyDigitsCep(draft.cep), lat, lng, radius_km: radius, terms: true }
      } as never);
      if (error) {
        if (error.code === "23505") { await checkExisting(); toast.info("Esta loja já está cadastrada."); return; }
        throw error;
      }
      toast.success("Cadastro recebido! Sua loja está em análise.");
      navigate("/revendedor", { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao cadastrar loja.");
    } finally { setSaving(false); }
  };

  const field = (label: string, key: "name" | "document" | "phone" | "address" | "radius_km", placeholder: string) => (
    <label className="block space-y-2 text-sm"><span>{label}</span>
      <input className="h-12 w-full rounded-lg border border-amber-700/40 bg-zinc-900 px-3 text-white" value={draft[key]}
        onChange={e => update(key, e.target.value)} placeholder={placeholder} required />
    </label>
  );
  return (
    <main className="min-h-screen bg-[#0c0c0c] px-4 py-8 text-zinc-100">
      <div className="mx-auto max-w-xl space-y-5">
        <Link to="/parceiros" className="text-sm text-amber-300">← Voltar a parceiros</Link>
        <h1 className="text-2xl font-bold text-[#e5c66c]">Cadastrar loja parceira</h1>
        <p className="text-sm text-zinc-300">Cadastre seu comércio na Adega Maromba. Seu cadastro será analisado antes da liberação.</p>
        {checking ? <p role="status">Verificando seus cadastros...</p> : null}
        {!checking && needsLogin ? <div className="rounded-xl border border-amber-600/40 p-5 text-sm"><p>Para cadastrar sua loja, entre na sua conta ou crie um cadastro. Depois você voltará para esta página.</p><Link className="mt-3 inline-block rounded-lg bg-amber-400 px-4 py-3 font-bold text-black" to="/auth?next=%2Fcadastro-parceiro">Entrar ou cadastrar conta</Link></div> : null}
        {checkError ? <div role="alert" className="rounded-lg border border-amber-500 p-4 text-sm">
          <p>{checkError}</p><button className="mt-3 underline" onClick={() => void checkExisting()}>Tentar novamente</button>
        </div> : null}
        {!checking && !checkError && existing.length > 0 ? (
          <div className="space-y-3 rounded-xl border border-amber-600/40 p-5">
            <p>Você já tem uma loja cadastrada nesta conta. Seus dados foram preservados.</p>
            {existing.map(store => <p key={store.id}>{store.name} — {store.status === "approved" ? "Aprovada" : "Em análise"}</p>)}
            <Link className="inline-block rounded-lg bg-amber-400 px-4 py-3 font-bold text-black" to="/revendedor">Acessar painel da loja</Link>
          </div>
        ) : null}
        {!checking && !needsLogin && !checkError && existing.length === 0 ? (
          <form className="space-y-4 rounded-xl border border-amber-600/30 bg-zinc-950 p-5" onSubmit={e => void submit(e)}>
            {field("Nome da loja", "name", "Nome do comércio")}
            {field("CNPJ", "document", "00.000.000/0000-00")}
            {field("Telefone / WhatsApp", "phone", "(19) 99999-9999")}
            <label className="block space-y-2 text-sm"><span>CEP</span>
              <div className="flex gap-2"><input className="h-12 min-w-0 flex-1 rounded-lg border border-amber-700/40 bg-zinc-900 px-3" value={draft.cep}
                onChange={e => setDraft(current => ({ ...current, cep: maskCepValue(e.target.value), lat: "", lng: "" }))} placeholder="00000-000" required />
                <button type="button" disabled={findingCep} onClick={() => void findCep()} className="rounded-lg border border-amber-500 px-3">{findingCep ? "Buscando..." : "Buscar CEP"}</button>
              </div>
            </label>
            {field("Endereço completo, incluindo número", "address", "Rua, número, complemento")}
            <p className="text-sm">Cidade / UF: {[draft.city, draft.state].filter(Boolean).join(" / ") || "Preenchido pelo CEP"}</p>
            {field("Raio de atendimento (km)", "radius_km", "15")}
            <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={draft.terms} onChange={e => update("terms", e.target.checked)} />
              <span>Li e aceito o <Link to="/termos" target="_blank" className="text-amber-300 underline">Termo Único da Adega Maromba</Link>.</span>
            </label>
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-amber-400 px-4 py-3 font-bold text-black disabled:opacity-60">
              {saving ? "Enviando..." : "Enviar loja para aprovação"}
            </button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
