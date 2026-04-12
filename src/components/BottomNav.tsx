import { Home, Store, Receipt, UserCircle } from "lucide-react";

const navItems = [
  { icon: Home, label: "HOME", active: true },
  { icon: Store, label: "SHOP", active: false },
  { icon: Receipt, label: "ORDERS", active: false },
  { icon: UserCircle, label: "PROFILE", active: false },
];

const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border md:hidden">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => (
          <button
            key={item.label}
            className={`flex flex-col items-center gap-1 px-3 py-1 ${
              item.active ? "text-primary" : "text-muted-foreground"
            }`}
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
