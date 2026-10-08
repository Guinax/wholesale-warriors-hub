import type { CartItem } from "@/contexts/CartContext";

export const WHATSAPP_NUMBER = "5519971151107";

function open(message: string) {
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank", "noopener,noreferrer");
}

export function contactWhatsApp(message?: string) {
  open(
    message ??
      "Olá! Vim pelo site da Adega Maromba e gostaria de falar com um consultor."
  );
}

export function sendOrderWhatsApp(items: CartItem[], totalPrice: number) {
  const lines = items.map(
    (i) =>
      `• ${i.name} — ${i.qty}x ${i.wholesalePrice} = R$ ${(i.priceNum * i.qty)
        .toFixed(2)
        .replace(".", ",")}`
  );
  const total = `R$ ${totalPrice.toFixed(2).replace(".", ",")}`;
  const message = [
    "*NOVO PEDIDO — ADEGA MAROMBA*",
    "",
    ...lines,
    "",
    `*TOTAL DO LOTE:* ${total}`,
    "",
    "Aguardo confirmação e instruções de pagamento/entrega.",
  ].join("\n");
  open(message);
}
