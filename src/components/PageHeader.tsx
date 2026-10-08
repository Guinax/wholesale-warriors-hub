import { ArrowLeft, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  backTo?: string;
}

const PageHeader = ({ eyebrow, title, subtitle, backTo }: PageHeaderProps) => {
  const navigate = useNavigate();
  const { totalItems, openCart } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
      <div className="container flex items-center justify-between h-14">
        <button
          onClick={() => backTo ? navigate(backTo) : navigate(-1)}
          className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
          aria-label="Voltar"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-heading font-bold text-xs tracking-wider hidden sm:inline">VOLTAR</span>
        </button>
        <Link to="/" className="font-heading font-black text-xs tracking-wider text-foreground">
          ADEGA MAROMBA
        </Link>
        <button className="relative p-2" onClick={openCart} aria-label="Carrinho">
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </button>
      </div>
      <div className="container py-8 space-y-2">
        {eyebrow && (
          <p className="text-xs font-heading font-semibold tracking-[0.3em] text-primary">{eyebrow}</p>
        )}
        <h1 className="font-heading font-black text-3xl md:text-5xl text-foreground italic leading-[0.95]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground max-w-xl border-l-2 border-primary pl-3">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
};

export default PageHeader;
