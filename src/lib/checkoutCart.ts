import type { CartItem } from "@/contexts/cart-context";

const PREFIX = "fm_paid_cart_order_v1:";

export function cartFingerprint(items: Pick<CartItem, "productId" | "name" | "qty">[]): string {
  return JSON.stringify(items.map(item => ({
    id: item.productId || null,
    name: item.name,
    qty: item.qty,
  })).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))));
}

/** Record only the cart submitted for this exact order, before leaving for the provider. */
export function rememberCheckoutCart(orderCode: string, items: CartItem[]): void {
  if (!orderCode || !items.length) return;
  try {
    localStorage.setItem(PREFIX + orderCode, cartFingerprint(items));
  } catch { /* Browser storage unavailable. */ }
}

/** Never empty a newer or unrelated cart just because an old receipt is paid. */
export function shouldClearPaidOrderCart(orderCode: string, items: CartItem[]): boolean {
  if (!orderCode || !items.length) return false;
  try {
    const snapshot = localStorage.getItem(PREFIX + orderCode);
    return snapshot !== null && snapshot === cartFingerprint(items);
  } catch {
    return false;
  }
}

export function forgetCheckoutCart(orderCode: string): void {
  try { localStorage.removeItem(PREFIX + orderCode); } catch { /* no-op */ }
}
