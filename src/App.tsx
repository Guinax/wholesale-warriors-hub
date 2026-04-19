import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import Index from "./pages/Index.tsx";
import CadastroCNPJ from "./pages/CadastroCNPJ.tsx";
import MaisVendidos from "./pages/MaisVendidos.tsx";
import Avaliacoes from "./pages/Avaliacoes.tsx";
import Comissoes from "./pages/Comissoes.tsx";
import Pagamento from "./pages/Pagamento.tsx";
import Recibo from "./pages/Recibo.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <CartProvider>
          <Toaster />
          <Sonner />
          <CartDrawer />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cadastro" element={<CadastroCNPJ />} />
            <Route path="/mais-vendidos" element={<MaisVendidos />} />
            <Route path="/avaliacoes" element={<Avaliacoes />} />
            <Route path="/comissoes" element={<Comissoes />} />
            <Route path="/pagamento" element={<Pagamento />} />
            <Route path="/recibo/:code" element={<Recibo />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
