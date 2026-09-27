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
  { key: "postado", label: "Preparando pedido", description: "Pagamento confirmado; pedido em separação para envio" },
  { key: "transito", label: "Em trânsito", description: "Encomenda a caminho do centro de distribuição" },
  { key: "saiu_entrega", label: "Saiu para entrega", description: "Encomenda saiu para entrega ao destinatário" },
  { key: "entregue", label: "Entregue", description: "Encomenda entregue com sucesso" },
] as const;

// Prazo de pagamento: vencimento padrão + tolerância de 2h antes da expiração
export const PAYMENT_DUE_HOURS = 24;
export const PAYMENT_GRACE_HOURS = 2;

export function computeDueAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + PAYMENT_DUE_HOURS * 3600_000);
}

export function computeExpiresAt(dueAt: string | Date): Date {
  const d = typeof dueAt === "string" ? new Date(dueAt) : dueAt;
  return new Date(d.getTime() + PAYMENT_GRACE_HOURS * 3600_000);
}

export function isOrderExpired(payment_status: string, dueAt?: string | null): boolean {
  if (payment_status === "expired") return true;
  if (payment_status !== "pending" || !dueAt) return false;
  return Date.now() > computeExpiresAt(dueAt).getTime();
}

export function formatCountdown(target: string | Date): string {
  const t = typeof target === "string" ? new Date(target) : target;
  const diff = t.getTime() - Date.now();
  if (diff <= 0) return "00:00:00";
  const h = Math.floor(diff / 3600_000);
  const m = Math.floor((diff % 3600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}
