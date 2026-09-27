import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Suplementos = () => {
  const { products } = useProducts("suplementos");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 01"
      title="SUPLEMENTOS"
      subtitle="Whey, creatina, termogênicos e mais. Preço de atacado a partir de 1 unidade."
      products={products.map(toCategoryProduct)}
      docTitle="Suplementos — Família Maromba"
    />
  );
};

export default Suplementos;
