// Cálculo de frete por CEP (consulta ViaCEP + tabela por região)

export interface CepInfo {
  cep: string;
  city: string;
  state: string;
  street: string;
  neighborhood: string;
}

const SUDESTE_SUL = ["SP", "RJ", "MG", "ES", "PR", "SC", "RS"];
const CENTRO_NORDESTE = ["GO", "MT", "MS", "DF", "BA", "SE", "AL", "PE", "PB", "RN", "CE", "PI", "MA"];

export const FREE_SHIPPING_FROM = 1000;

export function shippingCostFor(state: string, subtotal: number): number {
  if (subtotal >= FREE_SHIPPING_FROM) return 0;
  const uf = state.toUpperCase();
  if (uf === "SP") return 19.9;
  if (SUDESTE_SUL.includes(uf)) return 29.9;
  if (CENTRO_NORDESTE.includes(uf)) return 39.9;
  return 49.9; // Norte
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
