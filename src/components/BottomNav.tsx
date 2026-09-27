import { useState } from "react";
import { Home, Store, Receipt, UserCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useCart } from "@/contexts/CartContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { openCart, totalItems } = useCart();
  const [lookupOpen, setLookupOpen] = useState(false);
  const [code, setCode] = useState("");

  const submitLookup = () => {
    const clean = code.trim().toUpperCase();
    if (!clean) return;
    setLookupOpen(false);
    setCode("");
    navigate(`/recibo/${clean}`);
  };

  const navItems = [
    { icon: Home, label: "HOME", path: "/", badge: 0, action: () => navigate("/") },
    { icon: Store, label: "SACOLA", path: null, badge: totalItems, action: openCart },
    { icon: Receipt, label: "PEDIDOS", path: null, badge: 0, action: () => setLookupOpen(true) },
    { icon: UserCircle, label: "CADASTRO", path: "/cadastro", badge: 0, action: () => navigate("/cadastro") },
  ];

  return (
    <>
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

      <Dialog open={lookupOpen} onOpenChange={setLookupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading font-black text-base">RASTREAR PEDIDO</DialogTitle>
            <DialogDescription className="text-xs">
              Informe o código do pedido recebido após o pagamento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-[10px] font-heading font-bold tracking-wider text-muted-foreground">
              CÓDIGO DO PEDIDO
            </Label>
            <Input
              autoFocus
              value={code}
              placeholder="FM-XXXXXX-XXXX"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && submitLookup()}
            />
          </div>
          <DialogFooter>
            <button
              onClick={submitLookup}
              disabled={!code.trim()}
              className="w-full bg-primary text-primary-foreground font-heading font-black text-sm tracking-wider py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              CONSULTAR
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BottomNav;
