import { Menu, ShoppingCart, LogOut, Store as StoreIcon, User as UserIcon, Bike } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";
import { useCart } from "@/contexts/CartContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const TopNav = () => {
  const { totalItems, openCart } = useCart();
  const { session, user, isAdmin, signOut } = useAdminAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    toast.success("Você saiu da conta");
    navigate("/auth");
  };

  return (
    <>
    <nav className="fixed inset-x-0 top-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border shadow-sm">
      <div className="container flex items-center justify-between h-14">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => navigate("/")} aria-label="Ir para a página inicial" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><img src={logo} alt="Família Maromba" className="w-8 h-8 object-contain" width={32} height={32} /></button>
          <button type="button" onClick={() => navigate("/")} className="text-left font-heading font-bold text-xs tracking-wider text-foreground hover:text-primary transition-colors">REPRESENTANTE OFICIAL DA FAMÍLIA MAROMBA</button>
        </div>

        <div className="hidden md:flex items-center gap-6 text-xs font-heading font-semibold tracking-widest text-muted-foreground">
          <button onClick={() => navigate("/suplementos")} className="hover:text-primary transition-colors">SUPLEMENTOS</button>
          <button onClick={() => navigate("/mais-vendidos")} className="hover:text-primary transition-colors">MAIS VENDIDOS</button>
          <button onClick={() => navigate("/comissoes")} className="hover:text-primary transition-colors">COMISSÕES</button>
          <button onClick={() => navigate("/avaliacoes")} className="hover:text-primary transition-colors">AVALIAÇÕES</button>
          <button onClick={() => navigate("/compartilhar")} className="hover:text-primary transition-colors">COMPARTILHAR</button>
          <button onClick={() => navigate("/parceiros")} className="hover:text-primary transition-colors">PARCEIROS</button>
          <button onClick={() => navigate("/entregadores")} className="hover:text-primary transition-colors">ENTREGADORES</button>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger className="p-2 md:hidden" aria-label="Abrir menu de navegação">
              <Menu className="w-5 h-5 text-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 md:hidden">
              <DropdownMenuItem onClick={() => navigate("/")}>Início</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/suplementos")}>Suplementos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/mais-vendidos")}>Mais vendidos</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/comissoes")}>Comissões</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/avaliacoes")}>Avaliações</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/compartilhar")}>Compartilhar</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/parceiros")}><StoreIcon className="w-4 h-4 mr-2" /> Parceiros</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/entregadores")}><Bike className="w-4 h-4 mr-2" /> Entregadores</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!session && (
            <button
              onClick={() => navigate("/auth")}
              className="px-3 py-2 text-[11px] font-heading font-bold tracking-wider text-foreground hover:text-primary transition-colors"
            >
              ENTRAR
            </button>
          )}
          {session && (
            <DropdownMenu>
              <DropdownMenuTrigger className="p-2" aria-label="Conta do usuário">
                <UserIcon className="w-5 h-5 text-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">
                  {user?.email ?? "Minha conta"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/minha-conta")}>Meus dados</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/meus-pedidos")}>Meus pedidos</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/revendedor")}><StoreIcon className="w-4 h-4 mr-2" /> Área do parceiro</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/motoqueiro")}><Bike className="w-4 h-4 mr-2" /> Área do entregador</DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    Painel Admin
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <button className="relative p-2" onClick={openCart} aria-label="Carrinho">
            <ShoppingCart className="w-5 h-5 text-foreground" />
            {totalItems > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
    <div className="h-14" aria-hidden="true" />
    </>
  );
};

export default TopNav;
