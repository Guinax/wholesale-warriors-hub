import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import PartnerDeliveryBoard from "@/components/partners/PartnerDeliveryBoard";
import { assignedRequests, coordinates, routeUrl, type PartnerRequest } from "@/lib/partnerDelivery";

vi.mock("@/components/partners/PartnerMap", () => ({
  default: ({ points }: { points: Array<{ id: string; label: string }> }) =>
    <div data-testid="map">{points.map(p => <span key={p.id}>{p.label}</span>)}</div>,
}));
vi.mock("@/components/partners/PartnerCourierControls", () => ({
  default: ({ requestId, storeId }: { requestId: string; storeId: string }) =>
    <div data-testid="partner-courier-controls">{requestId}:{storeId}</div>,
}));
afterEach(cleanup);
const store = { id: "store-1", name: "Loja parceira", status: "approved", is_open: true, lat: -22.58, lng: -47.51 };
const request: PartnerRequest = {
  id: "request-1", store_id: store.id, status: "paid", payment_status: "paid", accepted_at: "2026-10-11T12:00:00Z",
  order_code: "PEDIDO-1", lat: -22.59, lng: -47.52, items: [{ name: "Produto", qty: 2 }],
  customer: { name: "Cliente de teste", street: "Rua Teste", number: "10", city: "Iracemápolis" },
};
const base = { stores: [store], offers: [], requests: [request], saving: null, availableStock: 10, waitingPayout: 0, showMap: true, onCommand: vi.fn(async () => {}), onNavigate: vi.fn() };
const selectOrder = () => fireEvent.click(screen.getByRole("button", { name: /PEDIDO-1/ }));

describe("Partner delivery map", () => {
  it("omits customer purchases and stores without approval from operational work", () => {
    const hidden = { ...request, id: "hidden", store_id: "other-store", order_code: "PRIVATE-ORDER" };
    render(<PartnerDeliveryBoard {...base} stores={[store, { ...store, id: "other-store", status: "pending" }]} requests={[request, hidden]} />);
    expect(screen.queryByText("PRIVATE-ORDER")).not.toBeInTheDocument();
    expect(within(screen.getByTestId("map")).getByText("PEDIDO-1")).toBeInTheDocument();
    expect(assignedRequests([request, hidden], [store])).toEqual([request]);
  });
  it("keeps new offers off the map until they are assigned", () => {
    const command = vi.fn(async () => {});
    render(<PartnerDeliveryBoard {...base} requests={[]} offers={[{ id: "new", items: [{ name: "Produto", qty: 1 }], city: "Limeira", distance_km: 4, subtotal: 20, partner_merchandise: 18 }]} onCommand={command} />);
    expect(screen.getByText(/cliente já pagou/i)).toBeInTheDocument();
    expect(within(screen.getByTestId("map")).queryByText("Limeira")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aceitar pedido" }));
    expect(command).toHaveBeenCalledWith("accept", { request_id: "new" }, "Pedido aceito.");
  });
  it("filters the list and markers together and supports search", () => {
    const delivery = { ...request, id: "delivery", order_code: "PEDIDO-2", status: "delivering" };
    render(<PartnerDeliveryBoard {...base} requests={[request, delivery]} />);
    fireEvent.click(screen.getByRole("button", { name: "Em entrega 1" }));
    expect(screen.queryByRole("button", { name: /PEDIDO-1/ })).not.toBeInTheDocument();
    expect(within(screen.getByTestId("map")).queryByText("PEDIDO-1")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Buscar pedido, cliente ou cidade" }), { target: { value: "inexistente" } });
    expect(screen.getByText("Nenhum pedido nesta seleção")).toBeInTheDocument();
  });
  it.each(["pending", null])("does not dispatch when payment confirmation is %s", payment => {
    render(<PartnerDeliveryBoard {...base} requests={[{ ...request, payment_status: payment }]} />);
    selectOrder();
    expect(screen.queryByRole("button", { name: /Saiu para entrega/ })).not.toBeInTheDocument();
  });
  it("routes a paid assigned order through the courier network controls", () => {
    render(<PartnerDeliveryBoard {...base} />);
    selectOrder();
    expect(screen.getByTestId("partner-courier-controls")).toHaveTextContent("request-1:store-1");
    const link = screen.getByRole("link", { name: "Abrir rota no mapa" });
    expect(link.getAttribute("href")).toContain("origin=-22.58%2C-47.51");
  });
  it("uses automatic route pricing and leaves final delivery confirmation to the courier flow", () => {
    const command = vi.fn(async () => {});
    const view = render(<PartnerDeliveryBoard {...base} requests={[{ ...request, status: "paid", payment_status: "paid", route_km: 4, shipping: 9, eta_minutes: 30 }]} onCommand={command} />);
    selectOrder();
    expect(screen.queryByLabelText("Trajeto (km)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Peso (kg)")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Prazo (min)")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Enviar cotação" })).not.toBeInTheDocument();
    expect(screen.getByText(/Trajeto calculado:/)).toBeInTheDocument();

    view.rerender(<PartnerDeliveryBoard {...base} requests={[{ ...request, status: "delivering" }]} onCommand={command} />);
    expect(screen.queryByLabelText("Código informado pelo cliente")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirmar entrega" })).not.toBeInTheDocument();
    expect(screen.getByText(/O motoqueiro confirma a entrega com o código informado pelo cliente/)).toBeInTheDocument();
  });
  it("does not fabricate coordinates for missing or invalid positions", () => {
    expect(coordinates({ lat: null, lng: null })).toBeNull();
    expect(coordinates({ lat: NaN, lng: 0 })).toBeNull();
    expect(coordinates({ lat: 91, lng: 0 })).toBeNull();
    expect(coordinates({ lat: 0, lng: 0 })).toEqual({ lat: 0, lng: 0 });
    expect(routeUrl({ ...request, lat: null }, store)).toBeNull();
  });
});
