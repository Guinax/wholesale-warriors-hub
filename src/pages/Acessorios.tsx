import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Acessorios = () => {
  const { products } = useProducts("acessorios");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 03"
      title="ACESSÓRIOS"
      subtitle="Cintos, straps, luvas e tudo que turbina o treino dos seus clientes."
      products={products.map(toCategoryProduct)}
      docTitle="Acessórios — Família Maromba"
    />
  );
};

export default Acessorios;
