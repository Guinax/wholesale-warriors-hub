import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Bebidas = () => {
  const { products } = useProducts("bebidas");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 05"
      title="BEBIDAS"
      subtitle="Whisky, vodka, gin e drinks da linha Mansão Maromba. Preço de atacado a partir de 1 unidade."
      products={products.map(toCategoryProduct)}
      docTitle="Bebidas — Família Maromba"
    />
  );
};

export default Bebidas;
