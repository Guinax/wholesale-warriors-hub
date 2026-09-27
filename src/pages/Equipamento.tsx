import CategoryPage from "@/components/CategoryPage";
import { useProducts, toCategoryProduct } from "@/hooks/useProducts";

const Equipamento = () => {
  const { products } = useProducts("equipamento");
  return (
    <CategoryPage
      eyebrow="CATEGORIA 04"
      title="EQUIPAMENTO"
      subtitle="Halteres, barras, anilhas e itens pesados para abastecer academias e box."
      products={products.map(toCategoryProduct)}
      docTitle="Equipamento — Família Maromba"
    />
  );
};

export default Equipamento;
