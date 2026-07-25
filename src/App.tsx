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
import Auth from "./pages/Auth.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import Admin from "./pages/Admin.tsx";
import Suplementos from "./pages/Suplementos.tsx";
import Roupas from "./pages/Roupas.tsx";
import Acessorios from "./pages/Acessorios.tsx";
import Equipamento from "./pages/Equipamento.tsx";
import NotFound from "./pages/NotFound.tsx";
import Compartilhar from "./pages/Compartilhar.tsx";
import ProtectedRoute from "./components/ProtectedRoute";

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
            <Route path="/pagamento" element={<ProtectedRoute><Pagamento /></ProtectedRoute>} />
            <Route path="/recibo/:code" element={<ProtectedRoute><Recibo /></ProtectedRoute>} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/entrar" element={<Auth />} />
            <Route path="/cadastro-login" element={<Auth />} />
            <Route path="/share" element={<Auth />} />
            <Route path="/convite" element={<Auth />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
            <Route path="/suplementos" element={<Suplementos />} />
            <Route path="/roupas" element={<Roupas />} />
            <Route path="/acessorios" element={<Acessorios />} />
            <Route path="/equipamento" element={<Equipamento />} />
            <Route path="/compartilhar" element={<Compartilhar />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
