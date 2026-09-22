import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Alimentos = () => {
  const { products } = useProducts("alimentos");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 06"
      title="ALIMENTAR"
      subtitle="Barras, pastas, snacks e alimentos fitness. Preço de atacado a partir de 1 unidade."
      products={products.map(toCategoryProduct)}
      docTitle="Alimentar — Família Maromba"
    />
  );
};

export default Alimentos;
