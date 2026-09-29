import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Suplementos = () => {
  const { products } = useProducts("suplementos");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 01"
      title="SUPLEMENTOS"
      subtitle="Whey, creatina, termogênicos e mais. Compra a partir de 1 unidade. Preço de atacado automático a partir de 6 unidades."
      products={products.map(toCategoryProduct)}
      docTitle="Suplementos — Família Maromba"
    />
  );
};

export default Suplementos;
