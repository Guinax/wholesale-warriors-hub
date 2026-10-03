import { useEffect, useRef, useState } from "react";
import * as L from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import "leaflet/dist/leaflet.css";

export type AdminPartnerMapStore = {
  id: string;
  name: string;
  status: string;
  lat: number | null;
  lng: number | null;
  city: string | null;
  state: string | null;
  address: string;
};

type Props = {
  stores: AdminPartnerMapStore[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const STATUS = {
  approved: { label: "Aprovado", color: "#16a34a" },
  pending: { label: "Pendente", color: "#d97706" },
  rejected: { label: "Reprovado", color: "#dc2626" },
  suspended: { label: "Suspenso", color: "#64748b" },
} as const;

export default function PartnerNetworkMap({ stores, selectedId, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const group = useRef<L.LayerGroup | null>(null);
  const selected = useRef(onSelect);
  const [tileError, setTileError] = useState(false);

  const mappedStores = stores.filter((store) =>
    Number.isFinite(Number(store.lat)) &&
    Number.isFinite(Number(store.lng)) &&
    Number(store.lat) >= -90 &&
    Number(store.lat) <= 90 &&
    Number(store.lng) >= -180 &&
    Number(store.lng) <= 180
  );

  useEffect(() => {
    selected.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!container.current || !mappedStores.length) return;

    const instance = L.map(container.current, {
      scrollWheelZoom: false,
      zoomControl: false,
      maxZoom: 19,
    });
    map.current = instance;
    group.current = L.layerGroup().addTo(instance);

    L.control.zoom({
      position: "bottomright",
      zoomInTitle: "Aproximar",
      zoomOutTitle: "Afastar",
    }).addTo(instance);

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
      group.current = null;
    };
  }, [mappedStores.length]);

  useEffect(() => {
    const instance = map.current;
    const layer = group.current;
    if (!instance || !layer || !mappedStores.length) return;

    layer.clearLayers();

    mappedStores.forEach((store) => {
      const status = STATUS[store.status as keyof typeof STATUS] ?? {
        label: store.status || "Sem status",
        color: "#71717a",
      };
      const isSelected = store.id === selectedId;

      const icon = L.divIcon({
        className: "admin-partner-map-marker",
        html: '<span style="' +
          'display:grid;place-items:center;width:36px;height:36px;border-radius:50% 50% 50% 6px;' +
          'border:3px solid #ffffff;box-shadow:0 3px 10px rgba(0,0,0,.45);font-weight:900;color:#fff;' +
          'background:' + status.color + ';' +
          (isSelected ? 'outline:4px solid #111827;outline-offset:2px;' : '') +
          '">L</span>',
        iconSize: [38, 42],
        iconAnchor: [19, 38],
      });

      const tooltip = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = store.name;
      const detail = document.createElement("div");
      detail.textContent = `${status.label} · ${[store.city, store.state].filter(Boolean).join("/") || store.address}`;
      tooltip.append(title, detail);

      L.marker([Number(store.lat), Number(store.lng)], {
        icon,
        title: store.name,
        alt: store.name,
        keyboard: true,
      })
        .bindTooltip(tooltip, { direction: "top", offset: [0, -32] })
        .on("click", () => selected.current(store.id))
        .addTo(layer);
    });

    instance.fitBounds(
      L.latLngBounds(mappedStores.map((store) => [Number(store.lat), Number(store.lng)] as L.LatLngTuple)),
      { padding: [50, 50], maxZoom: 14 }
    );
  }, [stores, selectedId]);

  const fitAll = () => {
    if (!map.current || !mappedStores.length) return;
    map.current.fitBounds(
      L.latLngBounds(mappedStores.map((store) => [Number(store.lat), Number(store.lng)] as L.LatLngTuple)),
      { padding: [50, 50], maxZoom: 14 }
    );
  };

  if (!mappedStores.length) {
    return (
      <div className="grid min-h-[360px] place-items-center rounded-xl border bg-muted/20 p-8 text-center text-muted-foreground">
        <div>
          <MapPin className="mx-auto mb-3 h-9 w-9" />
          <p className="font-semibold text-foreground">Nenhuma loja com coordenadas válidas</p>
          <p className="mt-1 text-sm">As lojas aparecerão aqui assim que tiverem latitude e longitude cadastradas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-xl border bg-muted/20">
      <div ref={container} className="absolute inset-0 z-0 min-h-[420px] w-full" aria-label="Mapa administrativo da rede de parceiros" />

      <div className="absolute left-3 top-3 z-[500] flex flex-wrap gap-2 rounded-lg border bg-background/95 p-2 text-[11px] shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-green-600" /> Aprovado</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-amber-600" /> Pendente</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-red-600" /> Reprovado</span>
        <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Suspenso</span>
      </div>

      <button
        type="button"
        onClick={fitAll}
        className="absolute right-3 top-3 z-[500] flex items-center gap-2 rounded-lg border bg-background/95 px-3 py-2 text-xs font-semibold shadow-sm backdrop-blur"
      >
        <LocateFixed className="h-4 w-4" />
        Ver todas
      </button>

      {tileError && (
        <div className="absolute bottom-3 left-3 right-3 z-[500] rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          O mapa não carregou por completo. As lojas continuam cadastradas normalmente.
        </div>
      )}
    </div>
  );
}
