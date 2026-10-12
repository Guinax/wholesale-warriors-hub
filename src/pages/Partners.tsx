import { ArrowRight, BadgeCheck, Bike, Boxes, CircleDollarSign, MapPin, ShieldCheck, Store, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import TopNav from "@/components/TopNav";
import BottomNav from "@/components/BottomNav";

const benefits = [
  { icon: MapPin, title: "Pedidos na sua região", description: "Receba oportunidades próximas conforme disponibilidade e estoque da sua loja." },
  { icon: TrendingUp, title: "Mais vendas", description: "Gerencie pedidos, produtos e resultados no painel do parceiro." },
  { icon: ShieldCheck, title: "Operação segura", description: "Cadastro sujeito à aprovação e acompanhamento pela plataforma." },
];

export default function Partners() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#0f131c] pb-24 text-[#dfe2ef] md:pb-0">
      <TopNav />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <section className="overflow-hidden rounded-3xl border border-amber-400/15 bg-[#181c25] shadow-2xl">
          <div className="relative min-h-[260px] overflow-hidden bg-[#0a0e17] p-6 sm:p-8">
            <div className="absolute inset-0 opacity-60" style={{backgroundImage:"radial-gradient(circle at 18% 72%,rgba(48,200,143,.5) 0 4px,transparent 5px),radial-gradient(circle at 72% 24%,rgba(254,107,0,.55) 0 4px,transparent 5px),linear-gradient(135deg,transparent 47%,rgba(245,158,11,.18) 48%,transparent 50%)",backgroundSize:"100% 100%,100% 100%,44px 44px"}} />
            <div className="relative z-10 max-w-xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-300"><BadgeCheck className="h-4 w-4"/> Rede Mansão Maromba</span>
              <h1 className="mt-5 text-3xl font-black leading-tight sm:text-4xl">Faça parte do nosso ecossistema de parceiros.</h1>
              <p className="mt-3 max-w-lg text-sm leading-6 text-zinc-300 sm:text-base">Lojas e entregadores conectados à operação local, com pedidos, estoque e repasses acompanhados pela plataforma.</p>
            </div>
          </div>
        </section>

        <section className="mt-7 space-y-4">
          <div>
            <span className="text-xs font-black uppercase tracking-[.16em] text-amber-300">Rede de parceiros</span>
            <h2 className="mt-1 text-2xl font-black">Escolha como deseja participar</h2>
          </div>

          <article className="rounded-3xl border border-white/10 bg-[#1c2029] p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300"><Store className="h-3.5 w-3.5"/> Para lojas e comércios</span><h3 className="mt-3 text-xl font-black">Cadastre sua loja</h3></div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/10 text-amber-300"><Store className="h-6 w-6"/></span>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">Entre para a rede, cadastre seu comércio e gerencie seu estoque individual pelo painel do parceiro.</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">{benefits.slice(0,2).map(({icon:Icon,title,description})=><div key={title} className="rounded-2xl bg-[#181c25] p-3"><div className="flex items-center gap-2 font-bold text-emerald-300"><Icon className="h-4 w-4"/><span className="text-xs">{title}</span></div><p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p></div>)}</div>
            <button type="button" onClick={()=>navigate("/cadastro-parceiro")} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-4 font-black text-black transition hover:brightness-110">Quero cadastrar minha loja <ArrowRight className="h-4 w-4"/></button>
            <button type="button" onClick={()=>navigate("/revendedor")} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-white/[.03] px-4 text-sm font-bold text-zinc-200">Já sou parceiro · acessar painel</button>
          </article>

          <article className="rounded-3xl border border-white/10 bg-[#1c2029] p-5 shadow-xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-300"><Bike className="h-3.5 w-3.5"/> Para entregadores</span><h3 className="mt-3 text-xl font-black">Trabalhe com entregas</h3></div>
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-orange-500/10 text-orange-300"><Bike className="h-6 w-6"/></span>
            </div>
            <p className="mt-4 text-sm leading-6 text-zinc-300">Cadastre-se para receber oportunidades de entrega compatíveis com a operação da rede e sua disponibilidade.</p>
            <div className="mt-4 rounded-2xl bg-[#181c25] p-4 text-sm text-zinc-300"><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-emerald-300"/> Oportunidades próximas</p><p className="mt-2 flex items-center gap-2"><CircleDollarSign className="h-4 w-4 text-amber-300"/> Valores e rotas exibidos no fluxo de entrega</p></div>
            <button type="button" onClick={()=>navigate("/cadastro-entregador")} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#353943] px-4 font-black text-white transition hover:bg-[#414650]"><Bike className="h-4 w-4"/> Cadastrar como entregador</button>
          </article>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">{benefits.map(({icon:Icon,title,description})=><div key={title} className="rounded-2xl border border-white/10 bg-[#181c25] p-4"><Icon className="h-5 w-5 text-amber-300"/><strong className="mt-3 block text-sm">{title}</strong><p className="mt-1 text-xs leading-5 text-zinc-400">{description}</p></div>)}</section>
        <footer className="mt-6 flex items-start gap-3 rounded-2xl bg-[#0a0e17] p-4 text-xs leading-5 text-zinc-400"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-orange-400"/><p>Cadastros e operações são submetidos às regras e validações da plataforma. Dados operacionais exibidos no painel são carregados do sistema; esta página não apresenta pedidos ou entregadores fictícios.</p></footer>
      </main>
      <BottomNav />
    </div>
  );
}
