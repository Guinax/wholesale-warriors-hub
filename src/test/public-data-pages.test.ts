// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Public data page contracts", () => {
  it("keeps bestseller ranking tied to live product price, stock and id", () => {
    const source = read("src/pages/MaisVendidos.tsx");
    expect(source).toContain('.from("bestsellers")');
    expect(source).toContain('.from("products")');
    expect(source).toContain("product_id: product.id");
    expect(source).toContain("unit_price: Number(product.unit_price)");
    expect(source).toContain("wholesale_price: Number(product.wholesale_price)");
    expect(source).toContain("stock: Number(product.stock");
    expect(source).toContain("productId: b.product_id");
    expect(source).toContain("RANKING EM FORMAÇÃO");
  });

  it("does not invent a commission threshold before tiers exist", () => {
    const source = read("src/pages/Comissoes.tsx");
    expect(source).not.toContain('Mínimo R$ 2.500');
    expect(source).toContain("Faixas em configuração");
    expect(source).toContain("PROGRAMA EM CONFIGURAÇÃO");
    expect(source).toContain("Nenhum percentual é exibido até existir uma regra comercial válida.");
  });
});
