import { ArrowRight, Bell, Boxes, CheckCircle2, CircleDollarSign, Clock3, Package, ShieldCheck, Store, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const previewMetrics = [
  { label: "Pedidos recebidos", value: "Acompanhe", icon: Package },
  { label: "Estoque da loja", value: "Atualizado", icon: Boxes },
  { label: "Repasses", value: "Transparente", icon: CircleDollarSign },
];

const Partners = () => {
  const navigate = useNavigate();
  const startRegistration = () => navigate("/revendedor");

  return (
    <div className="min-h-screen bg-[#090b0c] pb-24 text-zinc-100 md:pb-0">
      <TopNav />
      <main>
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="pointer-events-none absolute -right-24 -top-20 h-96 w-96 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 md:min-h-[620px] md:grid-cols-[0.9fr_1.1fr] md:py-16 lg:px-8">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.16em] text-yellow-200">
                <Store className="h-4 w-4" /> Rede de parceiros
              </span>
              <h1 className="mt-5 max-w-2xl font-heading text-4xl font-black leading-[1.02] sm:text-5xl lg:text-6xl">
                Sua loja no centro das <span className="text-yellow-400">vendas locais.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">
                Receba oportunidades de pedidos na sua região, acompanhe seu estoque e consulte os repasses em um só painel.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={startRegistration} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 font-black text-black transition hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200">
                  Cadastrar meu comércio <ArrowRight className="h-4 w-4" />
                </button>
                <button type="button" onClick={startRegistration} className="min-h-12 rounded-xl border border-white/15 px-5 font-semibold text-zinc-200 transition hover:border-yellow-400/50 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200">
                  Já sou parceiro · acessar painel
                </button>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yellow-300" /> Cadastro passa por aprovação</span>
                <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-yellow-300" /> Operação local pela sua loja</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-2xl">
              <div className="absolute -inset-5 rounded-[2rem] bg-yellow-400/[0.06] blur-2xl" />
              <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#0d1012] shadow-2xl shadow-black/50">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-4 sm:px-5">
                  <div>
                    <p className="text-sm font-black">Painel do parceiro</p>
                    <p className="mt-1 text-[11px] text-zinc-500">Prévia ilustrativa · acesso após aprovação</p>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1.5 text-[10px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Loja conectada</span>
                </div>
                <div className="grid sm:grid-cols-[142px_1fr]">
                  <aside className="hidden border-r border-white/10 p-3 sm:block">
                    <div className="mb-5 flex items-center gap-2 px-2 py-3">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-yellow-400 text-black"><Store className="h-4 w-4" /></div>
                      <div><p className="text-[10px] font-black leading-tight">MANSÃO</p><p className="text-[10px] font-black leading-tight">MAROMBA</p></div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="rounded-lg bg-yellow-400/15 px-3 py-2.5 font-bold text-yellow-200">Visão geral</div>
                      <div className="rounded-lg px-3 py-2.5 text-zinc-500">Pedidos</div>
                      <div className="rounded-lg px-3 py-2.5 text-zinc-500">Meu estoque</div>
                      <div className="rounded-lg px-3 py-2.5 text-zinc-500">Repasses</div>
                    </div>
                  </aside>
                  <div className="min-w-0 space-y-4 p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div><p className="text-lg font-black">Olá, parceiro</p><p className="mt-1 text-xs text-zinc-500">Pedidos, estoque e repasses no mesmo lugar.</p></div>
                      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5"><Bell className="h-4 w-4 text-yellow-300" /></div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {previewMetrics.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                          <Icon className="h-4 w-4 text-yellow-300" />
                          <p className="mt-3 truncate text-[10px] font-semibold text-zinc-400">{label}</p>
                          <p className="mt-1 truncate text-xs font-black text-zinc-200">{value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl border border-yellow-400/20 bg-gradient-to-br from-[#201a0c] to-[#111315] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-yellow-400/15 text-yellow-300"><Package className="h-5 w-5" /></div>
                          <div><p className="text-sm font-black">Pedidos da sua região</p><p className="mt-1 text-xs text-zinc-400">Receba avisos e escolha quando atender.</p></div>
                        </div>
                        <span className="hidden shrink-0 rounded-full border border-yellow-400/20 px-2 py-1 text-[9px] font-bold text-yellow-200 sm:inline-flex">NO PAINEL</span>
                      </div>
                      <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 p-3 text-xs text-zinc-300">
                        <Clock3 className="h-4 w-4 shrink-0 text-yellow-300" /> Acompanhe cada pedido do aceite até a entrega.
                      </div>
                    </div>
                    <div className="flex items-center gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.06] px-3 py-2.5 text-[11px] leading-5 text-emerald-100">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /> Pagamento do cliente centralizado na plataforma; repasse acompanhado no painel.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-400/10 text-yellow-300"><Package className="h-5 w-5" /></div>
              <h2 className="mt-4 font-heading text-lg font-black">Pedidos perto de você</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Acompanhe as oportunidades destinadas às lojas parceiras da região.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-400/10 text-yellow-300"><Boxes className="h-5 w-5" /></div>
              <h2 className="mt-4 font-heading text-lg font-black">Estoque acompanhado</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Registre a disponibilidade da loja e consulte os itens no painel.</p>
            </article>
            <article className="rounded-2xl border border-white/10 bg-white/[0.025] p-5">
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-yellow-400/10 text-yellow-300"><CircleDollarSign className="h-5 w-5" /></div>
              <h2 className="mt-4 font-heading text-lg font-black">Repasses visíveis</h2>
              <p className="mt-2 text-sm leading-6 text-zinc-400">Consulte o andamento dos valores destinados à sua loja.</p>
            </article>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-5 rounded-3xl border border-yellow-400/20 bg-gradient-to-r from-[#211a0a] via-[#121416] to-[#101214] p-6 sm:flex-row sm:items-center sm:p-8">
            <div><p className="text-xs font-bold uppercase tracking-[0.15em] text-yellow-300">Faça parte da rede</p><h2 className="mt-2 text-2xl font-black sm:text-3xl">Pronto para cadastrar seu comércio?</h2><p className="mt-2 text-sm text-zinc-400">Entre na sua conta para iniciar ou acompanhar o cadastro da loja.</p></div>
            <button type="button" onClick={startRegistration} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 font-black text-black transition hover:bg-yellow-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-200">
              Acessar cadastro <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>
      <BottomNav />
    </div>
  );
};

export default Partners;
