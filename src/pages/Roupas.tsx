import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Roupas = () => {
  const { products } = useProducts("roupas");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 02"
      title="ROUPAS"
      subtitle="Vestuário da Família Maromba — streetwear e treino com a identidade da marca."
      products={products.map(toCategoryProduct)}
      docTitle="Roupas — Família Maromba"
    />
  );
};

export default Roupas;
