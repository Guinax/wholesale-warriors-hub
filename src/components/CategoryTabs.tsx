import { Pill, Shirt, Dumbbell, Wrench } from "lucide-react";

const categories = [
  { id: "01", label: "SUPLEMENTOS", icon: Pill, sub: "bolt" },
  { id: "02", label: "ROUPAS", icon: Shirt, sub: "apparel" },
  { id: "03", label: "ACESSÓRIOS", icon: Dumbbell, sub: "fitness_center" },
  { id: "04", label: "EQUIPAMENTO", icon: Wrench, sub: "handyman" },
];

const CategoryTabs = () => {
  return (
    <section className="py-6">
      <div className="container">
        <div className="grid grid-cols-4 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="group flex flex-col items-center gap-2 p-3 rounded-lg bg-secondary hover:bg-secondary/80 border border-border hover:border-glow transition-all"
            >
              <span className="text-[10px] font-heading font-bold text-muted-foreground">
                {cat.id}
              </span>
              <cat.icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
              <span className="text-[9px] md:text-xs font-heading font-bold tracking-wider text-foreground">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoryTabs;
