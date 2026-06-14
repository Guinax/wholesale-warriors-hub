import CategoryPage from "@/components/CategoryPage";

const products = [
  {
    name: "COQUETELEIRA SHAKER 700ML",
    unitPrice: "R$ 49,00",
    wholesalePrice: "R$ 22,00",
    minQty: 1,
  },
  {
    name: "STRAP DE PUNHO PAR",
    unitPrice: "R$ 59,00",
    wholesalePrice: "R$ 29,00",
    minQty: 1,
  },
  {
    name: "CINTO DE LEVANTAMENTO",
    unitPrice: "R$ 199,00",
    wholesalePrice: "R$ 109,00",
    minQty: 1,
  },
  {
    name: "LUVA TREINO MAROMBA",
    unitPrice: "R$ 89,00",
    wholesalePrice: "R$ 45,00",
    minQty: 1,
  },
  {
    name: "JOELHEIRA POWER LIFT",
    unitPrice: "R$ 159,00",
    wholesalePrice: "R$ 79,00",
    minQty: 1,
  },
  {
    name: "GARRAFA TÉRMICA 1L",
    unitPrice: "R$ 89,00",
    wholesalePrice: "R$ 42,00",
    minQty: 1,
  },
];

const Acessorios = () => (
  <CategoryPage
    eyebrow="CATEGORIA 03"
    title="ACESSÓRIOS"
    subtitle="Cintos, straps, luvas e tudo que turbina o treino dos seus clientes."
    products={products}
    docTitle="Acessórios — Família Maromba"
  />
);

export default Acessorios;
