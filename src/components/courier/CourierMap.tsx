import { useEffect, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import { Crosshair, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

export type CourierMapPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "courier" | "pickup" | "dropoff" | "opportunity";
};

type Props = {
  points: CourierMapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const markerStyle = (kind: CourierMapPoint["kind"]): L.CircleMarkerOptions => {
  if (kind === "courier") return { radius: 10, weight: 4, opacity: 1, fillOpacity: 0.9 };
  if (kind === "dropoff") return { radius: 9, weight: 3, opacity: 1, fillOpacity: 0.8 };
  if (kind === "pickup") return { radius: 8, weight: 3, opacity: 1, fillOpacity: 0.75 };
  return { radius: 7, weight: 2, opacity: 1, fillOpacity: 0.65 };
};

export default function CourierMap({ points, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const layer = useRef<L.LayerGroup | null>(null);
  const selectRef = useRef(onSelect);
  const [tileError, setTileError] = useState(false);

  const validPoints = useMemo(
    () => points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng)),
    [points],
  );

  useEffect(() => {
    selectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!container.current || map.current) return;
    const instance = L.map(container.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      maxZoom: 19,
    }).setView([-22.4, -47.5], 11);

    map.current = instance;
    layer.current = L.layerGroup().addTo(instance);
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

    return () => {
      resize.disconnect();
      instance.remove();
      map.current = null;
      layer.current = null;
    };
  }, []);

  useEffect(() => {
    const instance = map.current;
    const group = layer.current;
    if (!instance || !group) return;

    group.clearLayers();
    for (const point of validPoints) {
      if (point.kind === "opportunity") {
        const selected = point.id === selectedId;
        const size = selected ? 42 : 34;
        const icon = L.divIcon({
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
          tooltipAnchor: [0, -(size / 2)],
          html: `
            <div
              aria-label="Loja aberta"
              style="
                width:${size}px;
                height:${size}px;
                display:grid;
                place-items:center;
                overflow:hidden;
                border-radius:9999px;
                border:${selected ? 3 : 2}px solid rgba(250,204,21,${selected ? 1 : 0.82});
                background:#050505;
                box-shadow:0 0 ${selected ? 22 : 12}px rgba(250,204,21,${selected ? 0.5 : 0.28});
                transition:transform .15s ease;
              "
            >
              <img
                src="/favicon-maromba-v2.png"
                alt=""
                style="width:82%;height:82%;object-fit:contain;border-radius:9999px;"
              />
            </div>
          `,
        });

        L.marker([point.lat, point.lng], { icon, riseOnHover: true })
          .bindTooltip(point.label, { direction: "top" })
          .on("click", () => selectRef.current(point.id))
          .addTo(group);
        continue;
      }

      const marker = L.circleMarker([point.lat, point.lng], markerStyle(point.kind))
        .bindTooltip(point.label, { direction: "top" })
        .on("click", () => selectRef.current(point.id))
        .addTo(group);

      if (point.id === selectedId) marker.setRadius(marker.getRadius() + 4);
    }

    if (validPoints.length === 1) {
      instance.setView([validPoints[0].lat, validPoints[0].lng], 14, { animate: false });
    } else if (validPoints.length > 1) {
      instance.fitBounds(
        L.latLngBounds(validPoints.map((point) => [point.lat, point.lng] as L.LatLngTuple)),
        { padding: [45, 45], maxZoom: 14 },
      );
    }
  }, [validPoints, selectedId]);

  const fit = () => {
    const instance = map.current;
    if (!instance || !validPoints.length) return;
    if (validPoints.length === 1) {
      instance.setView([validPoints[0].lat, validPoints[0].lng], 14);
      return;
    }
    instance.fitBounds(
      L.latLngBounds(validPoints.map((point) => [point.lat, point.lng] as L.LatLngTuple)),
      { padding: [45, 45], maxZoom: 14 },
    );
  };

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/10 bg-[#111214] lg:min-h-[560px]">
      <div ref={container} className="absolute inset-0" aria-label="Mapa operacional do entregador" />

      {!validPoints.length && (
        <div className="pointer-events-none absolute inset-0 z-[400] grid place-items-center bg-[#101214]/90 p-6 text-center">
          <div>
            <MapPin className="mx-auto h-9 w-9 text-yellow-300" />
            <p className="mt-3 font-black">Mapa operacional</p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-400">
              Quando você estiver aprovado e online, sua posição e as oportunidades próximas aparecerão aqui.
            </p>
          </div>
        </div>
      )}

      {validPoints.length > 0 && (
        <button
          type="button"
          onClick={fit}
          className="absolute right-3 top-3 z-[500] inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-black/80 px-3 text-xs font-black text-white shadow-lg"
        >
          <Crosshair className="h-4 w-4" />
          Ver todos
        </button>
      )}

      <div className="absolute bottom-3 left-3 z-[500] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2 rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-[10px] font-semibold text-zinc-300 shadow-lg">
        <span>● Você</span>
        <span>● Retirada</span>
        <span>● Entrega</span>
        <span className="inline-flex items-center gap-1">
          <img src="/favicon-maromba-v2.png" alt="" className="h-3.5 w-3.5 rounded-full object-contain" />
          Loja aberta
        </span>
      </div>

      {tileError && (
        <p className="absolute left-3 right-3 top-3 z-[500] rounded-xl border border-amber-400/20 bg-black/85 p-3 text-xs text-amber-200">
          O mapa não carregou por completo. As corridas continuam disponíveis pela lista e pela navegação externa.
        </p>
      )}
    </div>
  );
}
