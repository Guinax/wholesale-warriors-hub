import { ArrowRight, BadgeDollarSign, Bike, CarFront, Truck, Route, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

const modes = [
  { label: "Moto", icon: Bike, detail: "Entregas rápidas na cidade" },
  { label: "Bicicleta", icon: Bike, detail: "Rotas curtas e leves" },
  { label: "Utilitário", icon: CarFront, detail: "Mais volume por corrida" },
  { label: "Caminhão leve", icon: Truck, detail: "Pedidos maiores e abastecimento" },
];

export default function CourierRecruitmentBanner() {
  const navigate = useNavigate();

  return (
    <section className="border-y border-yellow-400/20 bg-[#0c0d0f]">
      <div className="container px-4 py-8">
        <div className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-[#221a07] via-[#111315] to-[#090a0b] p-5 shadow-2xl sm:p-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-52 w-52 rounded-full bg-yellow-400/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-amber-500/10 blur-3xl" />

          <div className="relative grid gap-7 lg:grid-cols-[1fr_1.05fr] lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.16em] text-yellow-300">
                <BadgeDollarSign className="h-4 w-4" /> Oportunidade para entregadores
              </span>

              <h2 className="mt-4 max-w-xl font-heading text-3xl font-black leading-tight text-white sm:text-4xl">
                Já está na rua? <span className="text-yellow-400">Faça suas rotas renderem mais.</span>
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300 sm:text-base">
                Se você trabalha de moto, bicicleta, utilitário ou caminhão leve, pode receber oportunidades de entrega da nossa rede e escolher as corridas que fazem sentido para você.
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-2"><Route className="h-4 w-4 text-yellow-300" /> Veja a rota antes de aceitar</span>
                <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-yellow-300" /> Cadastro e aprovação pela plataforma</span>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/entregadores")}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 font-black text-black transition hover:bg-yellow-300 sm:w-auto"
                >
                  QUERO FAZER ENTREGAS <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/auth?next=%2Fmotoqueiro")}
                  className="min-h-12 w-full rounded-xl border border-white/15 px-5 font-semibold text-zinc-200 transition hover:border-yellow-400/50 hover:text-white sm:w-auto"
                >
                  JÁ SOU ENTREGADOR · ENTRAR
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {modes.map(({ label, icon: Icon, detail }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => navigate("/entregadores")}
                  className="group rounded-2xl border border-white/10 bg-black/25 p-4 text-left transition hover:border-yellow-400/40 hover:bg-yellow-400/[0.06]"
                >
                  <div className="grid h-12 w-12 place-items-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-300 transition group-hover:scale-105">
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="mt-3 font-heading text-sm font-black text-white">{label}</p>
                  <p className="mt-1 text-xs leading-5 text-zinc-500">{detail}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
