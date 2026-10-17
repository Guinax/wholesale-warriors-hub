import { beforeEach, describe, expect, it } from "vitest";
import { cartFingerprint, forgetCheckoutCart, rememberCheckoutCart, shouldClearPaidOrderCart } from "@/lib/checkoutCart";
import type { CartItem } from "@/contexts/cart-context";

const juice: CartItem = { productId: "juice-1", name: "Suco Natural", qty: 1, unitPrice: "R$ 12,90", wholesalePrice: "R$ 10,00", priceNum: 12.9, minQty: 10 };

describe("order-scoped cart cleanup", () => {
  beforeEach(() => localStorage.clear());

  it("does not empty a cart without a checkout snapshot", () => {
    expect(shouldClearPaidOrderCart("ORDER-1", [juice])).toBe(false);
  });

  it("clears only the exact cart remembered for a paid order", () => {
    rememberCheckoutCart("ORDER-1", [juice]);
    expect(shouldClearPaidOrderCart("ORDER-1", [juice])).toBe(true);
    expect(shouldClearPaidOrderCart("ORDER-2", [juice])).toBe(false);
    expect(shouldClearPaidOrderCart("ORDER-1", [{ ...juice, qty: 2 }])).toBe(false);
    expect(shouldClearPaidOrderCart("ORDER-1", [juice, { ...juice, productId: "other" }])).toBe(false);
  });

  it("works independently of product ordering, then forgets the checkout", () => {
    const second = { ...juice, productId: "juice-2", name: "Outro suco" };
    rememberCheckoutCart("ORDER-1", [juice, second]);
    expect(cartFingerprint([juice, second])).toEqual(cartFingerprint([second, juice]));
    expect(shouldClearPaidOrderCart("ORDER-1", [second, juice])).toBe(true);
    forgetCheckoutCart("ORDER-1");
    expect(shouldClearPaidOrderCart("ORDER-1", [juice, second])).toBe(false);
  });

  it("preserves an unrelated new cart after the original purchase", () => {
    rememberCheckoutCart("ORDER-1", [juice]);
    const newCart = [{ ...juice, productId: "different-product", name: "Outra bebida" }];
    expect(shouldClearPaidOrderCart("ORDER-1", newCart)).toBe(false);
  });
});
