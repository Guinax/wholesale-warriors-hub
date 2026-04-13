import { Home, Store, Receipt, UserCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCart } = useCart();

  const navItems = [
    { icon: Home, label: "HOME", path: "/", action: () => navigate("/") },
    { icon: Store, label: "SHOP", path: null, action: openCart },
    { icon: Receipt, label: "PEDIDOS", path: null, action: () => {} },
    { icon: UserCircle, label: "CADASTRO", path: "/cadastro", action: () => navigate("/cadastro") },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${
              item.path && location.pathname === item.path ? "text-primary" : "text-muted-foreground"
            } hover:text-primary transition-colors`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[9px] font-heading font-bold tracking-wider">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
