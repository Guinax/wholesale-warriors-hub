import { useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { CartContext, CartItem, Shipping } from "./cart-context";
import { shippingCostFor } from "@/lib/shipping";

export type { CartItem };

const STORAGE_KEY = "fm_cart_v1";
const SHIPPING_KEY = "fm_shipping_v1";

function readShipping(): Shipping | null {
  try {
    const raw = localStorage.getItem(SHIPPING_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || typeof s.cep !== "string" || typeof s.state !== "string") return null;
    return s as Shipping;
  } catch {
    return null;
  }
}

function parsePrice(price: string): number {
  return parseFloat(price.replace("R$", "").replace(/\./g, "").replace(",", ".").trim());
}

function normalize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((i): i is Record<string, unknown> => !!i && typeof i === "object")
    .map((i) => {
      const name = String(i.name ?? "");
      const wholesalePrice = String(i.wholesalePrice ?? "R$ 0,00");
      const unitPrice = String(i.unitPrice ?? i.wholesalePrice ?? "R$ 0,00");
      const minQty = 1;
      const qty = Number.isFinite(Number(i.qty)) ? Math.max(1, Math.floor(Number(i.qty))) : 1;
      const selectedPrice = qty >= 6 ? parsePrice(wholesalePrice) : parsePrice(unitPrice);
      return { name, unitPrice, wholesalePrice, priceNum: Number.isFinite(selectedPrice) ? selectedPrice : 0, qty, minQty };
    })
    .filter((i) => i.name.length > 0);
}

function readStorage(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalize(raw ? JSON.parse(raw) : null);
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(readStorage);
  const [isOpen, setIsOpen] = useState(false);
  const [shipping, setShippingState] = useState<Shipping | null>(readShipping);

  const setShipping = useCallback((s: Shipping | null) => {
    setShippingState(s);
    try {
      if (s) localStorage.setItem(SHIPPING_KEY, JSON.stringify(s));
      else localStorage.removeItem(SHIPPING_KEY);
    } catch {
      /* storage indisponível */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* storage indisponível */
    }
  }, [items]);

  // Mantém o carrinho em sincronia entre abas/janelas e após voltar do bfcache
  useEffect(() => {
    const sync = () => {
      const stored = readStorage();
      setItems((prev) =>
        JSON.stringify(prev) === JSON.stringify(stored) ? prev : stored
      );
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === STORAGE_KEY) sync();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") sync();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", sync);
    window.addEventListener("focus", sync);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", sync);
      window.removeEventListener("focus", sync);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const addItem = useCallback((item: Omit<CartItem, "priceNum">) => {
    if (!Number.isSafeInteger(item.qty) || item.qty < 1) return;
    setItems((prev) => {
      const existing = prev.find((i) => i.name === item.name);
      if (existing) {
        return prev.map((i) => {
          if (i.name !== item.name) return i;
          const qty = i.qty + item.qty;
          const unitPrice = item.unitPrice ?? i.unitPrice;
          const wholesalePrice = item.wholesalePrice;
          return { ...i, unitPrice, wholesalePrice, qty, minQty: 1, priceNum: parsePrice(qty >= 6 ? wholesalePrice : unitPrice) };
        });
      }
      const qty = Math.max(1, item.qty);
      return [...prev, { ...item, qty, minQty: 1, priceNum: parsePrice(qty >= 6 ? item.wholesalePrice : item.unitPrice) }];
    });
    setIsOpen(true);
  }, []);

  const removeItem = useCallback((name: string) => {
    setItems((prev) => prev.filter((i) => i.name !== name));
  }, []);

  const updateQty = useCallback((name: string, qty: number) => {
    if (!Number.isSafeInteger(qty)) return;
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.name !== name) return [i];
        if (qty <= 0) return [];
        const nextQty = Math.max(1, qty);
        return [{ ...i, qty: nextQty, minQty: 1, priceNum: parsePrice(nextQty >= 6 ? i.wholesalePrice : i.unitPrice) }];
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
  const totalPrice = items.reduce((sum, i) => sum + i.priceNum * i.qty, 0);

  // Recalcula o frete conforme a quantidade total e o número de caixas.
  const shippingCost = shipping ? shippingCostFor(shipping.state, totalPrice, totalItems) : 0;
  const grandTotal = totalPrice + shippingCost;

  return (
    <CartContext.Provider
      value={{
        items,
        isOpen,
        openCart,
        closeCart,
        addItem,
        removeItem,
        updateQty,
        clearCart,
        totalItems,
        totalPrice,
        shipping,
        setShipping,
        shippingCost,
        grandTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
