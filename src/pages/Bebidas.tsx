import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Bebidas = () => {
  const { products } = useProducts("bebidas");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 05"
      title="BEBIDAS"
      subtitle="Whisky, vodka, gin e drinks da linha Mansão Maromba. Compra a partir de 1 unidade. Preço de atacado automático a partir de 6 unidades."
      products={products.map(toCategoryProduct)}
      docTitle="Bebidas — Adega Maromba"
    />
  );
};

export default Bebidas;
