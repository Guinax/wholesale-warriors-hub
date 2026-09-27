import { Pill, Shirt, Dumbbell, Wrench, Wine, Apple } from "lucide-react";
import { Link } from "react-router-dom";

const categories = [
  { id: "01", label: "SUPLEMENTOS", icon: Pill, path: "/suplementos" },
  { id: "02", label: "ROUPAS", icon: Shirt, path: "/roupas" },
  { id: "03", label: "ACESSÓRIOS", icon: Dumbbell, path: "/acessorios" },
  { id: "04", label: "EQUIPAMENTO", icon: Wrench, path: "/equipamento" },
  { id: "05", label: "BEBIDAS", icon: Wine, path: "/bebidas" },
  { id: "06", label: "ALIMENTAR", icon: Apple, path: "/alimentar" },
];

const CategoryTabs = () => {
  return (
    <section className="py-6">
      <div className="container">
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={cat.path}
              className="group flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 border border-border hover:border-glow transition-all"
            >
              <span className="text-[10px] font-heading font-bold text-muted-foreground">
                {cat.id}
              </span>
              <cat.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[9px] md:text-xs font-heading font-bold tracking-wider text-foreground">
                {cat.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryTabs;
