import { describe, expect, it } from "vitest";
import {
  shippingCostFor,
  shippingLoadFor,
  SHIPPING_ORIGIN_CEP,
} from "@/lib/shipping";

describe("frete operacional", () => {
  it("mantém Iracemápolis/SP como origem", () => {
    expect(SHIPPING_ORIGIN_CEP).toBe("13495-041");
  });

  it.each([
    [1, 1, 12.6],
    [6, 1, 12.6],
    [7, 2, 25.2],
    [12, 2, 25.2],
    [13, 3, 37.8],
  ])("calcula %i unidades em %i caixa(s)", (units, boxes, kg) => {
    expect(shippingLoadFor(units)).toEqual({ units, boxes, estimatedWeightKg: kg });
  });

  it.each([
    ["SP", 1, 19.9],
    ["SP", 7, 34.8],
    ["RJ", 7, 52.8],
    ["BA", 7, 69.8],
    ["AM", 7, 89.8],
  ])("mantém a tabela de frete para %s com %i unidade(s)", (uf, units, expected) => {
    expect(shippingCostFor(uf, 0, units)).toBe(expected);
  });
});
