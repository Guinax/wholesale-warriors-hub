import { createContext } from "react";

export interface CartItem {
  name: string;
  wholesalePrice: string;
  priceNum: number;
  qty: number;
  minQty: number;
}

export interface CartContextType {
  items: CartItem[];
  isOpen: boolean;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "priceNum">) => void;
  removeItem: (name: string) => void;
  updateQty: (name: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

export const CartContext = createContext<CartContextType | null>(null);
