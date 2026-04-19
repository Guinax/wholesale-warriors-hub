// Utilitários para pedidos: gerar código de pedido e código de rastreio fictícios

export function generateOrderCode(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `FM-${ts}-${rand}`;
}

export function generateTrackingCode(): string {
  // Padrão estilo Correios: BR + 9 dígitos + 2 letras
  const digits = Math.floor(100000000 + Math.random() * 900000000).toString();
  const letters = Array.from({ length: 2 }, () =>
    String.fromCharCode(65 + Math.floor(Math.random() * 26))
  ).join("");
  return `BR${digits}${letters}`;
}

export function formatCurrency(value: number): string {
  return `R$ ${value.toFixed(2).replace(".", ",")}`;
}

export const DELIVERY_STAGES = [
  { key: "postado", label: "Postado", description: "Pedido recebido e sendo preparado para envio" },
  { key: "transito", label: "Em trânsito", description: "Encomenda a caminho do centro de distribuição" },
  { key: "saiu_entrega", label: "Saiu para entrega", description: "Encomenda saiu para entrega ao destinatário" },
  { key: "entregue", label: "Entregue", description: "Encomenda entregue com sucesso" },
] as const;
