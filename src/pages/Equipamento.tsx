import CategoryPage from "@/components/CategoryPage";

const products = [
  {
    name: "KIT HALTERES AJUSTÁVEIS 20KG",
    unitPrice: "R$ 899,00",
    wholesalePrice: "R$ 549,00",
    minQty: 5,
  },
  {
    name: "BARRA OLÍMPICA 1.80M",
    unitPrice: "R$ 699,00",
    wholesalePrice: "R$ 429,00",
    minQty: 5,
  },
  {
    name: "ANILHAS EMBORRACHADAS 10KG (PAR)",
    unitPrice: "R$ 349,00",
    wholesalePrice: "R$ 189,00",
    minQty: 10,
  },
  {
    name: "BANCO SUPINO REGULÁVEL",
    unitPrice: "R$ 1.299,00",
    wholesalePrice: "R$ 789,00",
    minQty: 3,
  },
  {
    name: "ELÁSTICO MINI BAND KIT",
    unitPrice: "R$ 89,00",
    wholesalePrice: "R$ 42,00",
    minQty: 10,
  },
  {
    name: "CORDA NAVAL 12M",
    unitPrice: "R$ 499,00",
    wholesalePrice: "R$ 279,00",
    minQty: 5,
  },
];

const Equipamento = () => (
  <CategoryPage
    eyebrow="CATEGORIA 04"
    title="EQUIPAMENTO"
    subtitle="Halteres, barras, anilhas e itens pesados para abastecer academias e box."
    products={products}
    docTitle="Equipamento — Família Maromba"
  />
);

export default Equipamento;
