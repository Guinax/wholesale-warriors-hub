import CategoryPage from "@/components/CategoryPage";

const products = [
  {
    name: 'OVERSIZED "NO PAIN"',
    unitPrice: "R$ 139,00",
    wholesalePrice: "R$ 72,00",
    minQty: 10,
  },
  {
    name: "REGATA MAROMBA DRY-FIT",
    unitPrice: "R$ 99,00",
    wholesalePrice: "R$ 49,00",
    minQty: 10,
  },
  {
    name: "SHORT TACTEL FAMÍLIA",
    unitPrice: "R$ 119,00",
    wholesalePrice: "R$ 62,00",
    minQty: 10,
  },
  {
    name: "MOLETOM STREET HEAVY",
    unitPrice: "R$ 239,00",
    wholesalePrice: "R$ 129,00",
    minQty: 10,
  },
  {
    name: "BONÉ TRUCKER MAROMBA",
    unitPrice: "R$ 79,00",
    wholesalePrice: "R$ 39,00",
    minQty: 10,
  },
  {
    name: "LEGGING POWER PRO",
    unitPrice: "R$ 149,00",
    wholesalePrice: "R$ 79,00",
    minQty: 10,
  },
];

const Roupas = () => (
  <CategoryPage
    eyebrow="CATEGORIA 02"
    title="ROUPAS"
    subtitle="Vestuário da Família Maromba — streetwear e treino com a identidade da marca."
    products={products}
    docTitle="Roupas — Família Maromba"
  />
);

export default Roupas;
