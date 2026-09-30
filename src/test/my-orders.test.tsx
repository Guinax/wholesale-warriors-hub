import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MeusPedidos from "@/pages/MeusPedidos";

vi.mock("@/contexts/CartContext", () => ({ useCart: () => ({ totalItems: 0, openCart: vi.fn() }) }));

const api = vi.hoisted(() => {
  const query = { select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn() };
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  return { query, channel, getUser: vi.fn(), from: vi.fn(), removeChannel: vi.fn() };
});
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  auth: { getUser: api.getUser }, from: api.from,
  channel: () => api.channel, removeChannel: api.removeChannel,
} }));

beforeEach(() => {
  vi.clearAllMocks();
  api.getUser.mockResolvedValue({ data: { user: { id: "customer-a" } }, error: null });
  api.from.mockReturnValue(api.query);
  api.query.select.mockReturnValue(api.query);
  api.query.eq.mockReturnValue(api.query);
  api.query.order.mockReturnValue(api.query);
  api.query.limit.mockResolvedValue({ data: [], error: null });
  api.channel.on.mockReturnValue(api.channel);
  api.channel.subscribe.mockReturnValue(api.channel);
});
const open = () => render(<MemoryRouter><MeusPedidos /></MemoryRouter>);

describe("Customer order history", () => {
  it("loads only the signed-in customer's orders and cleans up its subscription", async () => {
    const page = open();
    expect(await screen.findByText("Você ainda não fez pedidos.")).toBeInTheDocument();
    expect(api.query.eq).toHaveBeenCalledWith("user_id", "customer-a");
    page.unmount();
    expect(api.removeChannel).toHaveBeenCalledWith(api.channel);
  });
  it("does not query orders when the session has expired", async () => {
    api.getUser.mockResolvedValue({ data: { user: null }, error: new Error("expired") });
    open();
    expect(await screen.findByText("Entrar novamente")).toBeInTheDocument();
    expect(api.from).not.toHaveBeenCalled();
  });
  it("shows a recoverable error instead of pretending the account has no orders", async () => {
    api.query.limit.mockResolvedValueOnce({ data: null, error: new Error("network") });
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar");
    expect(screen.queryByText("Você ainda não fez pedidos.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Atualizar" }));
    expect(await screen.findByText("Você ainda não fez pedidos.")).toBeInTheDocument();
  });
  it("reloads delivery details after a realtime event", async () => {
    open();
    await screen.findByText("Você ainda não fez pedidos.");
    api.query.limit.mockResolvedValue({ data: [{ id: "order-1", order_code: "FM-1", payment_status: "paid", delivery_status: "transito", total_amount: 99, tracking_code: "AB123456789BR", created_at: "2026-09-30T12:00:00Z" }], error: null });
    api.channel.on.mock.calls[0][2]();
    await waitFor(() => expect(screen.getByText(/AB123456789BR/)).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "Ver detalhes do pedido" })).toHaveAttribute("href", "/recibo/FM-1");
  });
});
