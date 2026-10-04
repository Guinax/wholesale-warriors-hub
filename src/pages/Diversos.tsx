import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Diversos = () => {
  const { products } = useProducts("diversos");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 04"
      title="DIVERSOS"
      subtitle="Produtos especiais, acessórios de lifestyle e novidades da Família Maromba."
      products={products.map(toCategoryProduct)}
      docTitle="Diversos — Família Maromba"
    />
  );
};

export default Diversos;
