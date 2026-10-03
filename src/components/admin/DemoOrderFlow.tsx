import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CheckCircle2, MapPin, Navigation, PackageCheck, RotateCcw, Store, Truck } from "lucide-react";
import PartnerMap, { type MapPoint } from "@/components/partners/PartnerMap";
import "@/components/partners/partner-delivery.css";

type DemoStage = "idle" | "broadcast" | "accepted" | "preparing" | "picked_up" | "delivering" | "delivered";

const stages: Array<{ id: DemoStage; label: string }> = [
  { id: "broadcast", label: "Enviado" },
  { id: "accepted", label: "Aceito" },
  { id: "preparing", label: "Separando" },
  { id: "picked_up", label: "Retirado" },
  { id: "delivering", label: "Em rota" },
  { id: "delivered", label: "Entregue" },
];

const stores = [
  { id: "store-1", name: "Adega Central Demo", lat: -22.5807, lng: -47.5189, distance: "1,8 km" },
  { id: "store-2", name: "Mercado Parceiro Demo", lat: -22.5861, lng: -47.5238, distance: "3,1 km" },
  { id: "store-3", name: "Bebidas Express Demo", lat: -22.5748, lng: -47.5094, distance: "4,6 km" },
];

const customer = { id: "customer", name: "Cliente Demo", lat: -22.5834, lng: -47.5141 };

const stageIndex = (stage: DemoStage) => stages.findIndex((item) => item.id === stage);

function ring() {
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.65);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.65);
    osc.onended = () => void ctx.close();
  } catch {
    // O som é apenas um reforço opcional da demonstração.
  }
}

export default function DemoOrderFlow() {
  const [stage, setStage] = useState<DemoStage>("idle");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const acceptedStore = stores[0];
  const current = stageIndex(stage);

  const points = useMemo<MapPoint[]>(() => {
    if (stage === "idle") return [];
    const list: MapPoint[] = [];
    const visibleStores = stage === "broadcast" ? stores : [acceptedStore];
    visibleStores.forEach((s) => list.push({ id: s.id, label: s.name, lat: s.lat, lng: s.lng, kind: "store" }));
    list.push({
      id: customer.id,
      label: stage === "delivered" ? "Cliente Demo · entregue" : "Cliente Demo · destino",
      lat: customer.lat,
      lng: customer.lng,
      kind: stage === "delivering" ? "delivering" : stage === "delivered" ? "delivered" : "preparing",
    });
    return list;
  }, [stage]);

  const openRoute = () => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${acceptedStore.lat},${acceptedStore.lng}&destination=${customer.lat},${customer.lng}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const reset = () => {
    setStage("idle");
    setSelectedId(null);
  };

  const sendOrder = () => {
    ring();
    setStage("broadcast");
  };

  return (
    <div className="space-y-4">
      <Card className="border-amber-500/40 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-300">DEMONSTRAÇÃO</Badge>
            <h2 className="mt-2 text-xl font-black">Fluxo de pedido local</h2>
            <p className="mt-1 text-sm text-muted-foreground">Simulação isolada: não cria pedido real, não altera estoque e não movimenta pagamento.</p>
          </div>
          <Button variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" /> Reiniciar</Button>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /><h3 className="font-bold">Pedido do cliente</h3></div>
            <div className="rounded-xl border p-3 text-sm">
              <p className="font-semibold">Cliente Demo</p>
              <p className="text-muted-foreground">Região central de Iracemápolis - SP · endereço fictício da demonstração</p>
              <p className="mt-2">2× Bebida 2L · 1× Energético</p>
              <p className="mt-1 font-bold">Total demonstrativo: R$ 58,90</p>
            </div>
            {stage === "idle" ? (
              <Button className="w-full" onClick={sendOrder}><Store className="h-4 w-4" /> Enviar pedido às lojas próximas</Button>
            ) : (
              <Badge variant="secondary" className="w-fit">Pedido DEMO-001 ativo</Badge>
            )}
          </Card>

          {stage === "broadcast" && <Card className="p-4 space-y-3 border-primary/30">
            <div className="flex items-center justify-between gap-2">
              <div><p className="font-bold">Pedido tocando nas lojas</p><p className="text-xs text-muted-foreground">3 parceiros próximos receberam a oportunidade.</p></div>
              <span className="animate-pulse rounded-full bg-primary px-2 py-1 text-[10px] font-black text-primary-foreground">TOCANDO</span>
            </div>
            {stores.map((s) => <div key={s.id} className="flex items-center justify-between gap-2 rounded-lg border p-3 text-sm"><span>{s.name}</span><span className="text-muted-foreground">{s.distance}</span></div>)}
            <Button className="w-full" onClick={() => setStage("accepted")}><CheckCircle2 className="h-4 w-4" /> Simular aceite da Adega Central</Button>
          </Card>}

          {stage !== "idle" && stage !== "broadcast" && <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2"><Store className="h-4 w-4 text-primary" /><h3 className="font-bold">{acceptedStore.name}</h3></div>
            <p className="text-xs text-muted-foreground">Parceiro responsável · {acceptedStore.distance} do cliente</p>
            {stage === "accepted" && <Button className="w-full" onClick={() => setStage("preparing")}><PackageCheck className="h-4 w-4" /> Iniciar separação</Button>}
            {stage === "preparing" && <Button className="w-full" onClick={() => setStage("picked_up")}><Truck className="h-4 w-4" /> Motoqueiro retirou o pedido</Button>}
            {stage === "picked_up" && <div className="grid gap-2">
              <Button variant="outline" onClick={openRoute}><Navigation className="h-4 w-4" /> Abrir rota no GPS</Button>
              <Button onClick={() => setStage("delivering")}><Truck className="h-4 w-4" /> Saiu para entrega</Button>
            </div>}
            {stage === "delivering" && <div className="grid gap-2">
              <Button variant="outline" onClick={openRoute}><Navigation className="h-4 w-4" /> Abrir rota no GPS</Button>
              <Button onClick={() => setStage("delivered")}><CheckCircle2 className="h-4 w-4" /> Confirmar entrega</Button>
            </div>}
            {stage === "delivered" && <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm"><strong>Entrega concluída.</strong><p className="mt-1 text-muted-foreground">O cliente veria o pedido como entregue no acompanhamento.</p></div>}
          </Card>}
        </div>

        <div className="space-y-4">
          <Card className="overflow-hidden p-0">
            {stage === "idle" ? <div className="grid min-h-[420px] place-items-center p-8 text-center text-muted-foreground"><div><MapPin className="mx-auto mb-3 h-10 w-10 text-primary" /><p className="font-semibold text-foreground">O mapa aparece quando o pedido é enviado.</p><p className="mt-1 text-sm">As lojas próximas e o destino do cliente serão exibidos aqui.</p></div></div> : <PartnerMap points={points} selectedId={selectedId} onSelect={setSelectedId} />}
          </Card>

          <Card className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold">Acompanhamento em tempo real</p>
                <p className="text-[11px] text-muted-foreground">Visão compacta do pedido, da aceitação até a entrega.</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Concluído</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" /> Atual</span>
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Pendente</span>
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-red-500/15">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${current < 0 ? 0 : ((current + 1) / stages.length) * 100}%` }}
              />
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 lg:grid-cols-6">
              {stages.map((item, index) => {
                const done = current > index;
                const active = current === index;
                const stateClass = done
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : active
                    ? "border-amber-400/50 bg-amber-400/10 ring-1 ring-amber-400/20"
                    : "border-red-500/25 bg-red-500/5";
                const dotClass = done
                  ? "bg-emerald-500 text-white"
                  : active
                    ? "bg-amber-400 text-black"
                    : "bg-red-500/80 text-white";
                return (
                  <div key={item.id} className={`flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 transition-all ${stateClass}`}>
                    <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-black ${dotClass}`}>
                      {done ? "✓" : index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-bold">{item.label}</p>
                      <p className="text-[9px] text-muted-foreground">
                        {done ? "Concluído" : active ? "Agora" : "Aguardando"}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
