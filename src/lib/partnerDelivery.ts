export type Coordinates = { lat: number; lng: number };
export type PartnerMapStore = {
  id: string;
  name: string;
  status: string;
  is_open: boolean;
  lat?: number | null;
  lng?: number | null;
};
export type PartnerOffer = {
  id: string;
  items: Array<{ name: string; qty: number }>;
  subtotal: number;
  city: string;
  distance_km: number;
  partner_merchandise: number;
};
export type PartnerRequest = {
  id: string;
  status: string;
  store_id?: string | null;
  store_name?: string | null;
  order_code?: string | null;
  payment_status?: string | null;
  shipping?: number | null;
  route_km?: number | null;
  eta_minutes?: number | null;
  lat?: number | null;
  lng?: number | null;
  customer?: { name?: string; street?: string; number?: string; complement?: string; city?: string; state?: string };
  items: Array<{ name: string; qty: number }>;
};
export type DeliveryFilter = "all" | "new" | "preparing" | "delivering" | "delivered";

export function coordinates(value: { lat?: number | null; lng?: number | null }): Coordinates | null {
  const { lat, lng } = value;
  return typeof lat === "number" && typeof lng === "number" &&
    Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 85.05112878 && Math.abs(lng) <= 180
    ? { lat, lng } : null;
}

export function deliveryStage(status: string): DeliveryFilter | null {
  if (["accepted", "quoted", "payment_pending", "paid"].includes(status)) return "preparing";
  if (status === "delivering" || status === "delivered") return status;
  return null;
}

export function assignedRequests(requests: PartnerRequest[], stores: PartnerMapStore[]): PartnerRequest[] {
  const ids = new Set(stores.filter(s => s.status === "approved").map(s => s.id));
  // The dashboard also returns the current user's purchases. Those are not store work.
  return requests.filter(r => r.store_id && ids.has(r.store_id) && deliveryStage(r.status));
}

export function canDispatch(request: PartnerRequest): boolean {
  return request.status === "paid" && request.payment_status === "paid";
}

export function routeUrl(request: PartnerRequest, store?: PartnerMapStore): string | null {
  const destination = coordinates(request);
  if (!destination) return null;
  const query = new URLSearchParams({ api: "1", destination: destination.lat + "," + destination.lng, travelmode: "driving" });
  const origin = store && coordinates(store);
  if (origin) query.set("origin", origin.lat + "," + origin.lng);
  return "https://www.google.com/maps/dir/?" + query.toString();
}

export function requestAddress(request: PartnerRequest): string {
  const c = request.customer;
  return c ? [c.street, c.number, c.complement, c.city, c.state].filter(Boolean).join(", ") : "";
}

export const requestStatus: Record<string, string> = {
  accepted: "Calcular entrega",
  quoted: "Frete enviado",
  payment_pending: "Aguardando pagamento",
  paid: "Pago · preparar",
  delivering: "Em entrega",
  delivered: "Concluído",
};
