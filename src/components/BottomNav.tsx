import { Home, Store, Receipt, UserCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCart, totalItems } = useCart();
  const navItems = [
    { icon: Home, label: "HOME", path: "/", badge: 0, action: () => navigate("/") },
    { icon: Store, label: "SACOLA", path: null, badge: totalItems, action: openCart },
    { icon: Receipt, label: "PEDIDOS", path: "/meus-pedidos", badge: 0, action: () => navigate("/meus-pedidos") },
    { icon: UserCircle, label: "CONTA", path: "/minha-conta", badge: 0, action: () => navigate("/minha-conta") },
  ];

  return (
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border md:hidden">
        <div className="flex items-center justify-around h-16">
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              aria-label={item.label}
              className={`relative flex flex-col items-center gap-1 px-3 py-1 ${
                item.path && location.pathname === item.path ? "text-primary" : "text-muted-foreground"
              } hover:text-primary transition-colors`}
            >
              <item.icon className="w-5 h-5" />
              {item.badge > 0 && (
                <span className="absolute -top-0.5 right-1 min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {item.badge}
                </span>
              )}
              <span className="text-[9px] font-heading font-bold tracking-wider">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
  );
};

export default BottomNav;
