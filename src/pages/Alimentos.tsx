import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Alimentos = () => {
  const { products } = useProducts("alimentos");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 06"
      title="ALIMENTAR"
      subtitle="Barras, pastas, snacks e alimentos fitness. Compra a partir de 1 unidade. Preço de atacado automático a partir de 6 unidades."
      products={products.map(toCategoryProduct)}
      docTitle="Alimentar — Adega Maromba"
    />
  );
};

export default Alimentos;
