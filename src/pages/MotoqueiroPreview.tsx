import { useMemo, useState } from "react";
import { Bike, MapPin, Navigation, Power, Wallet, ShieldCheck, Route, CheckCircle2, Clock3, Store, ArrowRight, BadgeDollarSign } from "lucide-react";

type Job = {
  id: string;
  pickup: string;
  dropoff: string;
  distanceKm: number;
  payout: number;
  detourKm: number;
  etaMin: number;
};

const jobs: Job[] = [
  { id: "CR-1048", pickup: "Adega Central", dropoff: "Jd. Nova Europa", distanceKm: 3.4, payout: 12, detourKm: 1.1, etaMin: 18 },
  { id: "CR-1051", pickup: "Mercado Avenida", dropoff: "Vila São João", distanceKm: 5.8, payout: 17, detourKm: 2.0, etaMin: 28 },
];

export default function MotoqueiroPreview() {
  const [online, setOnline] = useState(true);
  const [accepted, setAccepted] = useState<Job[]>([]);
  const [view, setView] = useState<"landing" | "dashboard">("landing");

  const earnings = useMemo(() => accepted.reduce((sum, job) => sum + job.payout, 0), [accepted]);

  const accept = (job: Job) => {
    if (accepted.some((item) => item.id === job.id) || accepted.length >= 2) return;
    setAccepted((current) => [...current, job]);
  };

  if (view === "landing") {
    return (
      <main className="min-h-screen bg-[#090909] text-white">
        <section className="mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-5 py-12 md:grid-cols-2 lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-yellow-300">
              <Bike className="h-4 w-4" /> Área do entregador
            </span>
            <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight sm:text-6xl">
              Já está na rua? <span className="text-yellow-400">Transforme o caminho em ganho.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
              Receba corridas perto da sua rota, escolha o que vale a pena e aproveite trajetos que hoje seriam feitos sem carga.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button onClick={() => setView("dashboard")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 font-black text-black">
                Quero trabalhar como entregador <ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setView("dashboard")} className="min-h-12 rounded-xl border border-white/15 px-5 font-semibold text-zinc-200">
                Já sou entregador · entrar
              </button>
            </div>
            <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-400">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yellow-300" /> Cadastro e aprovação</span>
              <span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-yellow-300" /> Corridas próximas</span>
              <span className="inline-flex items-center gap-2"><Wallet className="h-4 w-4 text-yellow-300" /> Ganho por entrega</span>
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-[#101214] p-5 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Prévia</p>
                <h2 className="mt-1 text-xl font-black">Painel do motoqueiro</h2>
              </div>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">ONLINE</span>
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <Route className="h-4 w-4 text-yellow-300" />
                <p className="mt-2 text-[10px] text-zinc-500">Corridas hoje</p><p className="font-black">4</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <BadgeDollarSign className="h-4 w-4 text-yellow-300" />
                <p className="mt-2 text-[10px] text-zinc-500">Ganhos</p><p className="font-black">R$ 48</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <Clock3 className="h-4 w-4 text-yellow-300" />
                <p className="mt-2 text-[10px] text-zinc-500">Disponível</p><p className="font-black">Agora</p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-yellow-400/20 bg-yellow-400/[0.06] p-4">
              <p className="text-xs text-zinc-400">Nova oportunidade perto da rota</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div><p className="font-black">+ R$ 12,00</p><p className="text-xs text-zinc-400">Desvio estimado: 1,1 km</p></div>
                <Navigation className="h-6 w-6 text-yellow-300" />
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] px-4 py-6 text-white">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#101214] p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Entregador demo</p>
            <h1 className="text-xl font-black">Motoqueiro #8472</h1>
          </div>
          <button onClick={() => setOnline((value) => !value)} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 font-bold ${online ? "bg-emerald-500 text-black" : "bg-zinc-800 text-zinc-300"}`}>
            <Power className="h-4 w-4" /> {online ? "Online" : "Offline"}
          </button>
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-[#101214] p-4"><p className="text-xs text-zinc-500">Ganhos desta sessão</p><p className="mt-1 text-2xl font-black text-yellow-400">R$ {earnings.toFixed(2).replace(".", ",")}</p></div>
          <div className="rounded-xl border border-white/10 bg-[#101214] p-4"><p className="text-xs text-zinc-500">Entregas ativas</p><p className="mt-1 text-2xl font-black">{accepted.length}/2</p></div>
          <div className="rounded-xl border border-white/10 bg-[#101214] p-4"><p className="text-xs text-zinc-500">GPS</p><p className="mt-1 font-black text-emerald-300">{online ? "Ativo na demo" : "Desligado"}</p></div>
          <div className="rounded-xl border border-white/10 bg-[#101214] p-4"><p className="text-xs text-zinc-500">Vínculo</p><p className="mt-1 font-black">Rede + loja</p></div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-white/10 bg-[#101214] p-4">
            <div className="flex items-center justify-between"><div><p className="text-sm font-black">Corridas perto de você</p><p className="text-xs text-zinc-500">Só aparecem oportunidades compatíveis com a rota.</p></div><MapPin className="h-5 w-5 text-yellow-300" /></div>
            <div className="mt-4 space-y-3">
              {jobs.map((job) => {
                const isAccepted = accepted.some((item) => item.id === job.id);
                return (
                  <article key={job.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-zinc-500">{job.id}</p>
                        <p className="mt-1 font-black">{job.pickup} → {job.dropoff}</p>
                        <p className="mt-1 text-xs text-zinc-400">{job.distanceKm} km · desvio +{job.detourKm} km · ~{job.etaMin} min</p>
                      </div>
                      <p className="text-xl font-black text-yellow-400">R$ {job.payout.toFixed(2).replace(".", ",")}</p>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button disabled={!online || isAccepted || accepted.length >= 2} onClick={() => accept(job)} className="min-h-10 flex-1 rounded-lg bg-yellow-400 px-4 font-black text-black disabled:cursor-not-allowed disabled:opacity-40">
                        {isAccepted ? "Corrida aceita" : "Aceitar corrida"}
                      </button>
                      <button className="min-h-10 rounded-lg border border-white/10 px-4 text-sm font-semibold text-zinc-300">Recusar</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#101214] p-4">
              <p className="text-sm font-black">Rota atual</p>
              <div className="mt-3 space-y-2">
                {accepted.length === 0 ? <p className="text-sm text-zinc-500">Nenhuma corrida aceita.</p> : accepted.map((job, index) => (
                  <div key={job.id} className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
                    <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /><strong className="text-sm">Entrega {index + 1}</strong></div>
                    <p className="mt-2 text-xs text-zinc-300">{job.pickup}</p>
                    <p className="text-xs text-zinc-500">↓ retirar produto</p>
                    <p className="text-xs text-zinc-300">{job.dropoff}</p>
                    <button className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-white/10 text-xs font-bold"><Navigation className="h-4 w-4" /> Abrir rota no GPS</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#101214] p-4">
              <p className="text-sm font-black">Como funciona</p>
              <div className="mt-3 space-y-2 text-xs text-zinc-400">
                <p>1. Fica online.</p>
                <p>2. Recebe corridas compatíveis.</p>
                <p>3. Aceita até 2 entregas ativas.</p>
                <p>4. Retira na loja.</p>
                <p>5. Segue pelo GPS.</p>
                <p>6. Cliente confirma com código secreto.</p>
              </div>
            </div>
          </aside>
        </section>

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-3 text-xs text-amber-100">
          DEMONSTRAÇÃO ISOLADA: nenhum pedido, estoque, pagamento ou localização real é alterado.
        </div>
      </div>
    </main>
  );
}
