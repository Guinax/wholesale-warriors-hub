import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";
import type { Coordinates } from "@/lib/partnerDelivery";

export type MapPoint = Coordinates & { id: string; label: string; kind: "store" | "preparing" | "delivering" | "delivered" };
type Props = { points: MapPoint[]; selectedId: string | null; onSelect: (id: string) => void };

export default function PartnerMap({ points, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const group = useRef<L.LayerGroup | null>(null);
  const select = useRef(onSelect);
  const fitted = useRef(false);
  const [tileError, setTileError] = useState(false);
  const hasPoints = points.length > 0;

  useEffect(() => { select.current = onSelect; }, [onSelect]);
  useEffect(() => {
    if (!container.current || !hasPoints) return;
    const instance = L.map(container.current, { scrollWheelZoom: false, zoomControl: false, maxZoom: 19 });
    map.current = instance;
    group.current = L.layerGroup().addTo(instance);
    L.control.zoom({ position: "bottomright", zoomInTitle: "Aproximar", zoomOutTitle: "Afastar" }).addTo(instance);
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      maxZoom: 19,
      keepBuffer: 0,
      updateWhenIdle: true,
      referrerPolicy: "strict-origin-when-cross-origin",
    }).addTo(instance);
    tiles.on("tileerror", () => setTileError(true));
    const resize = new ResizeObserver(() => instance.invalidateSize());
    resize.observe(container.current);
    return () => { resize.disconnect(); instance.remove(); map.current = null; group.current = null; fitted.current = false; };
  }, [hasPoints]);

  useEffect(() => {
    const instance = map.current, layer = group.current;
    if (!instance || !layer || !points.length) return;
    layer.clearLayers();
    points.forEach(point => {
      // Only fixed symbols enter HTML. Store names and order codes use textContent below.
      const icon = L.divIcon({
        className: "partner-map-marker",
        html: '<span class="partner-pin partner-pin--' + point.kind + (point.id === selectedId ? " partner-pin--selected" : "") + '">' + (point.kind === "store" ? '<img class="partner-pin-logo" src="/icon-192.png" alt="" aria-hidden="true" />' : "●") + "</span>",
        iconSize: [36, 42], iconAnchor: [18, 38],
      });
      const label = document.createElement("span");
      label.textContent = point.label;
      L.marker([point.lat, point.lng], { icon, title: point.label, alt: point.label, keyboard: true })
        .bindTooltip(label, { direction: "top", offset: [0, -32] })
        .on("click", () => select.current(point.id)).addTo(layer);
    });
    if (!fitted.current) {
      instance.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as L.LatLngTuple)), { padding: [50, 50], maxZoom: 14 });
      fitted.current = true;
    }
  }, [points, selectedId]);

  useEffect(() => {
    const point = points.find(p => p.id === selectedId);
    if (point && map.current) map.current.panTo([point.lat, point.lng], { animate: false });
  }, [selectedId, points]);

  const fit = () => {
    if (map.current && points.length) map.current.fitBounds(L.latLngBounds(points.map(p => [p.lat, p.lng] as L.LatLngTuple)), { padding: [50, 50], maxZoom: 14 });
  };

  return <div className="partner-map-wrap">
    {hasPoints ? <>
      <div ref={container} className="partner-map-canvas" aria-label="Mapa das lojas e dos destinos dos pedidos" />
      <button className="partner-map-fit" type="button" onClick={fit}><LocateFixed size={16} /> Ver todos os pontos</button>
      <div className="partner-map-legend"><span><i className="bg-yellow-400" /> Loja</span><span><i className="bg-blue-600" /> Em entrega</span><span><i className="bg-slate-500" /> Em preparo</span></div>
      {tileError && <p className="partner-map-warning" role="status">O mapa não carregou por completo. Consulte o endereço ou abra o trajeto do pedido.</p>}
    </> : <div className="partner-map-empty"><MapPin size={38} /><h3>Localização indisponível</h3><p>O mapa aparecerá quando houver coordenadas válidas da loja ou de um pedido aceito.</p></div>}
  </div>;
}
