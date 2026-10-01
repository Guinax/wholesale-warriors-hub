// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const read = (path: string) => readFileSync(path, "utf8");

describe("Product catalog contracts", () => {
  it("shows all beverage subcategories on the Bebidas page", () => {
    const source = read("src/hooks/useProducts.ts");
    expect(source).toContain('category === "bebidas"');
    for (const category of ["bebidas", "Alcoólicos", "Alcoólicos + Combo", "Gin Saborizado", "Não Alcoólicos"]) {
      expect(source).toContain(`"${category}"`);
    }
    expect(source).toContain('q = q.in("category"');
  });

  it("preserves stock through category rendering so sold-out products stay disabled", () => {
    const hook = read("src/hooks/useProducts.ts");
    const categoryPage = read("src/components/CategoryPage.tsx");
    const card = read("src/components/ProductCard.tsx");
    expect(hook).toContain("stock: p.stock");
    expect(categoryPage).toContain("stock?: number");
    expect(card).toContain('stock !== undefined && stock < qty');
    expect(card).toContain('"ESTOQUE EM ATUALIZAÇÃO"');
  });

  it("supports safe bulk shipping dimensions by package volume", () => {
    const source = read("src/components/admin/ShippingIntegrationManager.tsx");
    expect(source).toContain('value="750ml"');
    expect(source).toContain('value="1l"');
    expect(source).toContain('ilike("name", "%750mL%")');
    expect(source).toContain('ilike("name", "%1L%")');
    expect(source).toContain("Produtos já completos não serão alterados");
  });
});
