import { ArrowRight, BadgeDollarSign, Bike, MapPin, Route, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";

export default function Entregadores(){
 const navigate=useNavigate();
 return <div className="min-h-screen bg-[#090909] pb-24 text-white md:pb-0"><TopNav/>
 <main><section className="mx-auto grid min-h-[680px] max-w-7xl items-center gap-10 px-5 py-12 md:grid-cols-2 lg:px-8">
 <div>
  <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.16em] text-yellow-300"><Bike className="h-4 w-4"/> Rede de entregadores</span>
  <h1 className="mt-6 max-w-xl text-4xl font-black leading-tight sm:text-6xl">Seu caminho pode valer <span className="text-yellow-400">mais dinheiro.</span></h1>
  <p className="mt-5 max-w-xl text-base leading-7 text-zinc-300 sm:text-lg">Receba oportunidades perto de você, escolha corridas compatíveis com sua rota e aumente seus ganhos sem ficar preso a uma única loja.</p>
  <div className="mt-8 flex flex-col gap-3 sm:flex-row">
   <button onClick={()=>navigate("/motoqueiro")} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 font-black text-black">Quero trabalhar como entregador <ArrowRight className="h-4 w-4"/></button>
   <button onClick={()=>navigate("/motoqueiro")} className="min-h-12 rounded-xl border border-white/15 px-5 font-semibold text-zinc-200">Já sou entregador · entrar</button>
  </div>
  <div className="mt-6 flex flex-wrap gap-4 text-xs text-zinc-400"><span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yellow-300"/> Cadastro aprovado pela plataforma</span><span className="inline-flex items-center gap-2"><MapPin className="h-4 w-4 text-yellow-300"/> Oportunidades próximas</span></div>
 </div>
 <div className="rounded-3xl border border-white/10 bg-[#101214] p-5 shadow-2xl shadow-black/50">
  <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Como funciona</p><h2 className="mt-1 text-2xl font-black">Você decide quando rodar.</h2>
  <div className="mt-5 space-y-3">
   <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><Bike className="h-5 w-5 text-yellow-300"/><strong className="mt-3 block">Fique online quando quiser</strong><p className="mt-1 text-sm text-zinc-400">Sua localização operacional só é usada enquanto você estiver disponível ou em entrega.</p></div>
   <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4"><Route className="h-5 w-5 text-yellow-300"/><strong className="mt-3 block">Veja o impacto na rota</strong><p className="mt-1 text-sm text-zinc-400">Origem, região do destino, distância e valor aparecem antes do aceite.</p></div>
   <div className="rounded-xl border border-yellow-400/20 bg-yellow-400/[0.06] p-4"><BadgeDollarSign className="h-5 w-5 text-yellow-300"/><strong className="mt-3 block">Transforme trajeto em ganho</strong><p className="mt-1 text-sm text-zinc-400">Pode trabalhar para uma loja vinculada e continuar disponível para oportunidades da rede.</p></div>
  </div>
 </div>
 </section></main><BottomNav/></div>;
}