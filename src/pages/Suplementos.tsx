import CategoryPage from "@/components/CategoryPage";
import iWantYou from "@/assets/i-want-you.jpeg";
import productsHero from "@/assets/products-hero.jpeg";

const products = [
  {
    badge: "CIMED EDITION",
    name: "MONSTER WHEY 2KG",
    unitPrice: "R$ 249,00",
    wholesalePrice: "R$ 145,00",
    minQty: 1,
    image: productsHero,
  },
  {
    badge: "LANÇAMENTO",
    badgeColor: "bg-success",
    name: "I WANT YOU THERMOGÊNICO",
    unitPrice: "R$ 89,00",
    wholesalePrice: "R$ 49,00",
    minQty: 1,
    image: iWantYou,
  },
  {
    name: "CREATINE PURE 500G",
    unitPrice: "R$ 120,00",
    wholesalePrice: "R$ 65,00",
    minQty: 1,
  },
  {
    name: "PRE-WORKOUT VOLTAGE",
    unitPrice: "R$ 189,00",
    wholesalePrice: "R$ 98,00",
    minQty: 1,
  },
  {
    name: "BCAA 2:1:1 - 300G",
    unitPrice: "R$ 99,00",
    wholesalePrice: "R$ 54,00",
    minQty: 1,
  },
  {
    name: "GLUTAMINA 300G",
    unitPrice: "R$ 109,00",
    wholesalePrice: "R$ 59,00",
    minQty: 1,
  },
];

const Suplementos = () => (
  <CategoryPage
    eyebrow="CATEGORIA 01"
    title="SUPLEMENTOS"
    subtitle="Whey, creatina, termogênicos e mais. Preço de atacado a partir de 1 unidade."
    products={products}
    docTitle="Suplementos — Família Maromba"
  />
);

export default Suplementos;
