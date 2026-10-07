import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const BebidasNaturais = () => {
  const { products } = useProducts("bebidas_naturais");
  return (
    <CategoryPage
      eyebrow="LINHA NATURAL"
      title="BEBIDAS NATURAIS"
      subtitle="Sucos naturais Mansão Maromba. Compra a partir de 1 unidade. Preço de atacado automático a partir de 6 unidades. Frete calculado separadamente."
      products={products.map(toCategoryProduct)}
      docTitle="Bebidas Naturais — Mansão Maromba"
    />
  );
};

export default BebidasNaturais;
