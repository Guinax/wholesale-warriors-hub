import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const BebidasNaturais = () => {
  const { products } = useProducts("bebidas_naturais");
  // Preserva os produtos antigos no banco para pedidos e histórico;
  // quando os novos sabores forem cadastrados, exibe somente esta linha.
  const novosSucos = products.filter((product) =>
    product.name.startsWith("Suco Adega Maromba ")
  );
  const vitrine = novosSucos.length > 0 ? novosSucos : products;

  return (
    <CategoryPage
      eyebrow="SUCOS 500 ML"
      title="SUCOS ADEGA MAROMBA"
      subtitle="Laranja, laranja com acerola, maracujá, uva e abacaxi com hortelã. Garrafinhas de 500 ml. Frete calculado separadamente."
      products={vitrine.map(toCategoryProduct)}
      docTitle="Sucos 500 ml — Adega Maromba"
    />
  );
};

export default BebidasNaturais;
