import { useMemo, useState } from "react";
import { Boxes, CheckCircle2, ChevronDown, MapPin, Navigation, Package, Search, Store, Truck, WalletCards } from "lucide-react";
import PartnerMap, { type MapPoint } from "./PartnerMap";
import {
  assignedRequests, canDispatch, coordinates, deliveryStage, requestAddress, requestStatus, routeUrl,
  type DeliveryFilter, type PartnerMapStore, type PartnerOffer, type PartnerRequest,
} from "@/lib/partnerDelivery";
import "./partner-delivery.css";

type Command = (action: string, payload: Record<string, unknown>, success: string) => Promise<void>;
type Props = {
  stores: PartnerMapStore[];
  offers: PartnerOffer[];
  requests: PartnerRequest[];
  saving: string | null;
  availableStock: number;
  waitingPayout: number;
  showMap: boolean;
  onCommand: Command;
  onNavigate: (tab: "inicio" | "pedidos" | "estoque" | "repasses" | "loja") => void;
};
const filters: Array<{ id: DeliveryFilter; label: string }> = [
  { id: "all", label: "Todos" }, { id: "new", label: "Novos" }, { id: "preparing", label: "Em preparo" },
  { id: "delivering", label: "Em entrega" }, { id: "delivered", label: "Concluídos" },
];
const money = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

function OrderActions({ request, saving, onCommand }: { request: PartnerRequest; saving: string | null; onCommand: Command }) {
  const [km, setKm] = useState(String(request.route_km ?? ""));
  const [kg, setKg] = useState("");
  const [eta, setEta] = useState(String(request.eta_minutes ?? ""));
  const [code, setCode] = useState("");
  const [adult, setAdult] = useState(false);
  const busy = saving !== null;
  if (["accepted", "quoted"].includes(request.status)) return <form className="delivery-action-form" onSubmit={e => {
    e.preventDefault();
    void onCommand("quote", { request_id: request.id, route_km: Number(km), weight_kg: Number(kg), eta_minutes: Number(eta) }, "Cotação enviada ao cliente.");
  }}>
    <p className="delivery-form-title">Calcular entrega</p>
    <div className="delivery-form-grid">
      <label>Trajeto (km)<input required type="number" min="0.1" max="250" step="0.1" value={km} onChange={e => setKm(e.target.value)} /></label>
      <label>Peso (kg)<input required type="number" min="0.01" max="1000" step="0.01" value={kg} onChange={e => setKg(e.target.value)} /></label>
      <label>Prazo (min)<input required type="number" min="10" max="1440" step="1" value={eta} onChange={e => setEta(e.target.value)} /></label>
    </div>
    <button type="submit" className="delivery-button delivery-button-primary" disabled={busy}>{busy ? "Aguarde..." : "Enviar cotação"}</button>
  </form>;
  if (canDispatch(request)) return <button className="delivery-button delivery-button-primary" disabled={busy} onClick={() => void onCommand("dispatch", { request_id: request.id }, "Pedido saiu para entrega.")}><Truck size={16} /> Saiu para entrega</button>;
  if (request.status === "delivering" && request.payment_status === "paid") return <form className="delivery-action-form" onSubmit={e => {
    e.preventDefault();
    void onCommand("deliver", { request_id: request.id, code: code.trim().toUpperCase(), adult_verified: adult }, "Entrega confirmada.");
  }}>
    <label>Código informado pelo cliente<input required value={code} maxLength={8} minLength={8} autoComplete="off" onChange={e => setCode(e.target.value)} /></label>
    <label className="delivery-checkbox"><input required type="checkbox" checked={adult} onChange={e => setAdult(e.target.checked)} /> Conferi a maioridade do recebedor</label>
    <button className="delivery-button delivery-button-primary" disabled={busy} type="submit"><CheckCircle2 size={16} /> Confirmar entrega</button>
  </form>;
  if (request.status === "payment_pending" || request.status === "paid") return <p className="delivery-payment-note">A saída para entrega será liberada com o pagamento confirmado.</p>;
  return null;
}

export default function PartnerDeliveryBoard({ stores, offers, requests, saving, availableStock, waitingPayout, showMap, onCommand, onNavigate }: Props) {
  const [filter, setFilter] = useState<DeliveryFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const owned = useMemo(() => assignedRequests(requests, stores), [requests, stores]);
  const uniqueOffers = useMemo(() => Array.from(new Map(offers.map(o => [o.id, o])).values()), [offers]);
  const matches = (value: string) => value.toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"));
  const visible = owned.filter(r => (filter === "all" || deliveryStage(r.status) === filter) && matches([r.order_code, r.customer?.name, requestAddress(r), r.store_name].join(" ")));
  const visibleOffers = uniqueOffers.filter(o => (filter === "all" || filter === "new") && matches(o.city + " " + o.items.map(i => i.name).join(" ")));
  const visibleIds = new Set(visible.map(r => r.id));
  const activeSelection = selectedId?.startsWith("store:") || (selectedId && visibleIds.has(selectedId)) ? selectedId : null;
  const points = useMemo(() => {
    const mapped: MapPoint[] = [];
    stores.filter(s => s.status === "approved").forEach(s => {
      const location = coordinates(s);
      if (location) mapped.push({ ...location, id: "store:" + s.id, label: s.name, kind: "store" });
    });
    owned.filter(r => (filter === "all" || deliveryStage(r.status) === filter) && [r.order_code, r.customer?.name, requestAddress(r), r.store_name].join(" ").toLocaleLowerCase("pt-BR").includes(search.trim().toLocaleLowerCase("pt-BR"))).forEach(r => {
      const location = coordinates(r);
      const stage = deliveryStage(r.status);
      if (location && stage && stage !== "all" && stage !== "new") mapped.push({ ...location, id: r.id, label: r.order_code || "Pedido #" + r.id.slice(0, 8), kind: stage });
    });
    return mapped;
  }, [stores, owned, filter, search]);
  const count = (id: DeliveryFilter) => id === "all" ? owned.length + uniqueOffers.length : id === "new" ? uniqueOffers.length : owned.filter(r => deliveryStage(r.status) === id).length;
  const delivering = owned.filter(r => r.status === "delivering").length;

  return <section className="partner-delivery-board" aria-label="Central de entregas">
    <header className="delivery-board-heading">
      <div><p className="delivery-eyebrow">PAINEL DO PARCEIRO</p><h1>{showMap ? "Entregas no mapa" : "Seus pedidos"}</h1><p>Acompanhe os pedidos da sua loja, do aceite até a entrega.</p></div>
      <button className="delivery-button delivery-button-outline" onClick={() => onNavigate(showMap ? "pedidos" : "inicio")}><MapPin size={16} />{showMap ? "Ver só a lista" : "Ver mapa"}</button>
    </header>
    <div className={showMap ? "delivery-workspace" : "delivery-workspace delivery-workspace-list"}>
      <div className="delivery-list">
        <div className="delivery-list-heading"><h2>Pedidos da região <span>{owned.length + uniqueOffers.length}</span></h2>
          <label className="delivery-search"><Search size={17} /><input aria-label="Buscar pedido, cliente ou cidade" placeholder="Buscar pedido, cliente ou cidade" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <div className="delivery-filters" aria-label="Filtrar pedidos">{filters.map(f => <button key={f.id} type="button" aria-pressed={filter === f.id} className={filter === f.id ? "is-active" : ""} onClick={() => setFilter(f.id)}>{f.label} <span>{count(f.id)}</span></button>)}</div>
        </div>
        <div className="delivery-cards">
          {visibleOffers.map(o => <article key={o.id} className="delivery-order delivery-order-new">
            <div className="delivery-order-title"><h3>Nova solicitação</h3><span className="delivery-badge delivery-badge-new">Novo</span></div>
            <p className="delivery-address"><MapPin size={14} />{o.city} · {Number(o.distance_km).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</p>
            <p className="delivery-items">{o.items.map(i => i.qty + "× " + i.name).join(" · ")}</p>
            <p className="delivery-offer-value">Mercadorias para a loja <strong>{money(Number(o.partner_merchandise))}</strong></p>
            <p className="delivery-hint">O destino aparece no mapa após o aceite.</p>
            <div className="delivery-order-buttons"><button className="delivery-button delivery-button-outline" disabled={saving !== null} onClick={() => void onCommand("decline", { request_id: o.id }, "Oferta recusada.")}>Recusar</button><button className="delivery-button delivery-button-primary" disabled={saving !== null} onClick={() => void onCommand("accept", { request_id: o.id }, "Pedido aceito.")}>Aceitar pedido</button></div>
          </article>)}
          {visible.map(r => {
            const selected = activeSelection === r.id;
            const url = routeUrl(r, stores.find(s => s.id === r.store_id));
            return <article id={"partner-request-" + r.id} key={r.id} className={"delivery-order" + (selected ? " delivery-order-selected" : "")}>
              <button className="delivery-order-select" aria-expanded={selected} onClick={() => setSelectedId(selected ? null : r.id)}>
                <span className="delivery-order-title"><strong>{r.order_code || "#" + r.id.slice(0, 8)}</strong><span className={"delivery-badge delivery-badge-" + deliveryStage(r.status)}>{requestStatus[r.status]}</span></span>
                <strong className="delivery-customer">{r.customer?.name || r.store_name || "Pedido da loja"}</strong>
                <span className="delivery-items">{r.items?.map(i => i.qty + "× " + i.name).join(" · ")}</span>
                <span className="delivery-address"><MapPin size={14} />{requestAddress(r) || "Endereço não informado"}</span>
                <span className="delivery-details-label">{selected ? "Fechar detalhes" : "Ver pedido"}<ChevronDown size={16} /></span>
              </button>
              {selected && <div className="delivery-order-details">
                {url ? <a className="delivery-button delivery-button-outline" href={url} target="_blank" rel="noopener noreferrer"><Navigation size={16} /> Consultar trajeto</a> : <p className="delivery-hint">Este pedido ainda não tem coordenadas válidas. Confira o endereço informado.</p>}
                {r.shipping != null && <p className="delivery-hint">Entrega: {money(Number(r.shipping))}{r.eta_minutes ? " · prazo informado: " + r.eta_minutes + " min" : ""}</p>}
                <OrderActions key={r.id + r.status} request={r} saving={saving} onCommand={onCommand} />
              </div>}
            </article>;
          })}
          {visible.length === 0 && visibleOffers.length === 0 && <div className="delivery-empty"><Package size={32} /><h3>Nenhum pedido nesta seleção</h3><p>{search ? "Tente outro nome, cidade ou código." : "Novas solicitações aparecerão aqui quando estiverem disponíveis."}</p></div>}
        </div>
      </div>
      {showMap && <div className="delivery-map-section">
        <PartnerMap points={points} selectedId={activeSelection} onSelect={id => {
          setSelectedId(id);
          if (!id.startsWith("store:")) document.getElementById("partner-request-" + id)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
        }} />
        <div className="delivery-map-caption"><MapPin size={14} />Pontos de destino informados no pedido. Confira o endereço antes de sair.</div>
        <div className="delivery-metrics">
          <button onClick={() => onNavigate("estoque")}><span className="delivery-metric-icon"><Boxes size={20} /></span><span><small>Estoque disponível</small><strong>{availableStock.toLocaleString("pt-BR")} itens</strong></span></button>
          <button onClick={() => setFilter("delivering")}><span className="delivery-metric-icon"><Truck size={20} /></span><span><small>Em entrega</small><strong>{delivering} pedidos</strong></span></button>
          <button onClick={() => onNavigate("repasses")}><span className="delivery-metric-icon"><WalletCards size={20} /></span><span><small>Aguardando repasse</small><strong>{money(waitingPayout)}</strong></span></button>
        </div>
      </div>}
    </div>
    <footer className="delivery-board-footer"><Store size={14} />{stores.filter(s => s.status === "approved" && s.is_open).length} loja(s) aberta(s)<span>•</span><span>Pagamento confirmado antes de sair para entrega</span></footer>
  </section>;
}
