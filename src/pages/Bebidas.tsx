import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Bebidas = () => {
  const { products: bebidas } = useProducts("bebidas");
  const { products: sucos } = useProducts("bebidas_naturais");
  // Só adiciona a nova linha própria; não mostra os antigos rótulos da Mansão
  // como se fossem produtos da Adega Maromba.
  const novosSucos = sucos.filter((product) =>
    product.name.startsWith("Suco Adega Maromba ")
  );
  const products = [...bebidas, ...novosSucos];
  return (
    <CategoryPage
      eyebrow="CATEGORIA 05"
      title="BEBIDAS"
      subtitle="Whisky, vodka, gin, drinks e sucos Adega Maromba de 500 ml. Compra a partir de 1 unidade. Preço de atacado automático a partir de 6 unidades."
      products={products.map(toCategoryProduct)}
      docTitle="Bebidas — Adega Maromba"
    />
  );
};

export default Bebidas;
