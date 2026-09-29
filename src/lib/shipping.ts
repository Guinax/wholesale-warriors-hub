// Cálculo inicial de frete por CEP, peso e caixas.
// Origem operacional: Iracemápolis/SP - CEP 13495-041.
// Referência inicial: caixa padrão com até 6 unidades, ~12,6 kg carregada.
// Estes parâmetros ficam centralizados para ajuste conforme os fretes reais da operação.

export interface CepInfo {
  cep: string;
  city: string;
  state: string;
  street: string;
  neighborhood: string;
  latitude?: number;
  longitude?: number;
}

export interface ShippingLoad {
  units: number;
  boxes: number;
  estimatedWeightKg: number;
}

const SUDESTE_SUL = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];
const CENTRO_NORDESTE = ["GO", "MT", "MS", "DF", "BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"];

export const SHIPPING_ORIGIN_CEP = "13495-041";
export const UNITS_PER_BOX = 6;
export const ESTIMATED_BOX_WEIGHT_KG = 12.6;
export const MIN_BILLABLE_WEIGHT_KG = 1;

export function shippingLoadFor(totalUnits: number): ShippingLoad {
  const units = Math.max(1, Math.ceil(totalUnits));
  const boxes = Math.max(1, Math.ceil(units / UNITS_PER_BOX));
  const estimatedWeightKg = Math.max(
    MIN_BILLABLE_WEIGHT_KG,
    Number((boxes * ESTIMATED_BOX_WEIGHT_KG).toFixed(1)),
  );
  return { units, boxes, estimatedWeightKg };
}

function baseRateFor(state: string): number {
  const uf = state.toUpperCase();
  if (uf === "SP") return 19.9;
  if (SUDESTE_SUL.includes(uf)) return 29.9;
  if (CENTRO_NORDESTE.includes(uf)) return 39.9;
  return 49.9;
}

function extraBoxRateFor(state: string): number {
  const uf = state.toUpperCase();
  if (uf === "SP") return 14.9;
  if (SUDESTE_SUL.includes(uf)) return 22.9;
  if (CENTRO_NORDESTE.includes(uf)) return 29.9;
  return 39.9;
}

export function shippingCostFor(state: string, _subtotal: number, totalUnits = 1): number {
  const { boxes } = shippingLoadFor(totalUnits);
  const cost = baseRateFor(state) + Math.max(0, boxes - 1) * extraBoxRateFor(state);
  return Number(cost.toFixed(2));
}

export function shippingEtaFor(state: string): string {
  const uf = state.toUpperCase();
  if (uf === "SP") return "1 a 3 dias úteis";
  if (SUDESTE_SUL.includes(uf)) return "3 a 6 dias úteis";
  if (CENTRO_NORDESTE.includes(uf)) return "5 a 10 dias úteis";
  return "7 a 14 dias úteis";
}

export const onlyDigitsCep = (v: string) => v.replace(/\D/g, "").slice(0, 8);

export const maskCepValue = (v: string) =>
  onlyDigitsCep(v).replace(/(\d{5})(\d{0,3})/, (_, a, b) => (b ? `${a}-${b}` : a));

export async function lookupCep(cep: string): Promise<CepInfo | null> {
  const digits = onlyDigitsCep(cep);
  if (digits.length !== 8) return null;
  try {
    const geoRes = await fetch(`https://brasilapi.com.br/api/cep/v2/${digits}`);
    if (geoRes.ok) {
      const data = await geoRes.json();
      const lat = Number(data?.location?.coordinates?.latitude);
      const lng = Number(data?.location?.coordinates?.longitude);
      return { cep: maskCepValue(digits), city: data.city ?? "", state: data.state ?? "", street: data.street ?? "", neighborhood: data.neighborhood ?? "", latitude: Number.isFinite(lat) ? lat : undefined, longitude: Number.isFinite(lng) ? lng : undefined };
    }
  } catch { /* ViaCEP fallback below */ }
  return lookupCepViaCep(digits);
}

async function lookupCepViaCep(cep: string): Promise<CepInfo | null> {
  const digits = onlyDigitsCep(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.erro) return null;
    return {
      cep: maskCepValue(digits),
      city: data.localidade ?? "",
      state: data.uf ?? "",
      street: data.logradouro ?? "",
      neighborhood: data.bairro ?? "",
    };
  } catch {
    return null;
  }
}
