import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";

const TopNav = () => {
  const [cartCount] = useState(3);

  return (
    <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <img src={logo} alt="Mansão Maromba" className="w-8 h-8 object-contain" width={32} height={32} />
          <span className="font-heading font-bold text-xs tracking-wider text-foreground">
            LOJA OFICIAL FAMÍLIA MAROMBA
          </span>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-heading font-semibold tracking-widest text-muted-foreground">
          <a href="#" className="hover:text-primary transition-colors">SUPLEMENTOS</a>
          <a href="#" className="hover:text-primary transition-colors">WHOLESALE</a>
          <a href="#" className="hover:text-primary transition-colors">COMMUNITY</a>
        </div>

        <button className="relative p-2">
          <ShoppingCart className="w-5 h-5 text-foreground" />
          {cartCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </nav>
  );
};

export default TopNav;
