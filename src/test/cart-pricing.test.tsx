import { act, cleanup, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { CartProvider, useCart } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";

const product = { name: "Bebida", unitPrice: "R$ 10,00", wholesalePrice: "R$ 8,00", minQty: 1, qty: 1 };

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("Compra por unidade e atacado por produto", () => {
  it("recalcula ao passar de cinco para seis e ao voltar para cinco", () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    act(() => result.current.addItem({ ...product, qty: 5 }));
    expect(result.current.totalPrice).toBe(50);
    act(() => result.current.addItem(product));
    expect(result.current.items[0].priceNum).toBe(8);
    expect(result.current.totalPrice).toBe(48);
    act(() => result.current.updateQty(product.name, 5));
    expect(result.current.items[0].priceNum).toBe(10);
    expect(result.current.totalPrice).toBe(50);
  });

  it("mantém preço unitário para produtos distintos abaixo de seis", () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    act(() => {
      result.current.addItem({ ...product, qty: 3 });
      result.current.addItem({ ...product, name: "Outra bebida", qty: 3 });
    });
    expect(result.current.totalPrice).toBe(60);
  });



  it("mantém sete sucos como sete unidades no varejo", () => {
    const juice = {
      name: "Suco Natural Larandelly Laranja 500 ml",
      unitPrice: "R$ 12,90",
      wholesalePrice: "R$ 9,90",
      minQty: 1,
      qty: 7,
    };
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    act(() => result.current.addItem(juice));
    expect(result.current.items[0].qty).toBe(7);
    expect(result.current.items[0].priceNum).toBe(12.9);
    expect(result.current.totalPrice).toBeCloseTo(90.3);
  });

  it("aplica atacado de sucos somente ao atingir dez unidades somadas", () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    act(() => {
      result.current.addItem({
        name: "Suco Natural Larandelly Laranja 500 ml",
        unitPrice: "R$ 12,90",
        wholesalePrice: "R$ 9,90",
        minQty: 1,
        qty: 6,
      });
      result.current.addItem({
        name: "Suco Natural Larandelly Uva 500 ml",
        unitPrice: "R$ 12,90",
        wholesalePrice: "R$ 9,90",
        minQty: 1,
        qty: 4,
      });
    });
    expect(result.current.totalItems).toBe(10);
    expect(result.current.items.every((item) => item.priceNum === 9.9)).toBe(true);
    expect(result.current.totalPrice).toBeCloseTo(99);
  });

  it("trata também o nome legado de suco como venda avulsa", () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    act(() => result.current.addItem({
      name: "Suco Natural Laranja Mansão Maromba 500 ml",
      unitPrice: "R$ 12,90",
      wholesalePrice: "R$ 9,90",
      minQty: 1,
      qty: 7,
    }));
    expect(result.current.items[0].qty).toBe(7);
    expect(result.current.items[0].priceNum).toBe(12.9);
  });

  it("preserva productId no carrinho e separa produtos pelo UUID", () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    act(() => {
      result.current.addItem({ ...product, productId: "produto-a", qty: 1 });
      result.current.addItem({ ...product, productId: "produto-b", qty: 1 });
    });
    expect(result.current.items).toHaveLength(2);
    expect(result.current.items.map((item) => item.productId)).toEqual(["produto-a", "produto-b"]);
    expect(JSON.parse(localStorage.getItem("fm_cart_v1") ?? "[]").map((item: { productId?: string }) => item.productId)).toEqual(["produto-a", "produto-b"]);
  });


  it("altera e remove somente o UUID selecionado quando nomes são iguais", () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    act(() => {
      result.current.addItem({ ...product, productId: "produto-a", qty: 1 });
      result.current.addItem({ ...product, productId: "produto-b", qty: 1 });
    });
    act(() => result.current.updateQty("produto-b", 6));
    expect(result.current.items.find((item) => item.productId === "produto-a")?.qty).toBe(1);
    expect(result.current.items.find((item) => item.productId === "produto-b")?.qty).toBe(6);
    expect(result.current.items.find((item) => item.productId === "produto-b")?.priceNum).toBe(8);
    act(() => result.current.removeItem("produto-a"));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].productId).toBe("produto-b");
  });

  it("ignora quantidades inválidas sem corromper o total", () => {
    const { result } = renderHook(() => useCart(), { wrapper: CartProvider });
    act(() => result.current.addItem(product));
    act(() => {
      result.current.updateQty(product.name, NaN);
      result.current.updateQty(product.name, 1.5);
      result.current.addItem({ ...product, qty: -2 });
    });
    expect(result.current.totalPrice).toBe(10);
    expect(result.current.totalItems).toBe(1);
  });

  it.each([[1, "10,00", "Faltam 5"], [6, "8,00", "Atacado aplicado"]])(
    "mostra no carrinho o preço efetivo para %i unidade(s)", (qty, price, label) => {
      localStorage.setItem("fm_cart_v1", JSON.stringify([{ ...product, qty, priceNum: 999 }]));
      const { result } = renderHook(() => useCart(), {
        wrapper: ({ children }) => <MemoryRouter><CartProvider>{children}<CartDrawer /></CartProvider></MemoryRouter>,
      });
      act(() => result.current.openCart());
      expect(screen.getByText(new RegExp(`${price}.* /un`))).toBeInTheDocument();
      expect(screen.getByText(new RegExp(label))).toBeInTheDocument();
    },
  );
});
