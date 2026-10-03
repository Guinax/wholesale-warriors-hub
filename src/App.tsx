import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import CartDrawer from "@/components/CartDrawer";
import CommandCenterLauncher from "@/components/admin/CommandCenterLauncher";
import Index from "./pages/Index.tsx";
import CadastroCNPJ from "./pages/CadastroCNPJ.tsx";
import CadastroCliente from "./pages/CadastroCliente.tsx";
import MaisVendidos from "./pages/MaisVendidos.tsx";
import Avaliacoes from "./pages/Avaliacoes.tsx";
import Comissoes from "./pages/Comissoes.tsx";
import Pagamento from "./pages/Pagamento.tsx";
import Recibo from "./pages/Recibo.tsx";
import Auth from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import OAuthConsent from "./pages/OAuthConsent.tsx";
import Admin from "./pages/Admin.tsx";
import CommandCenter from "./pages/CommandCenter.tsx";
import CampaignMediaStudio from "./pages/CampaignMediaStudio.tsx";
import Produto from "./pages/Produto.tsx";
import Suplementos from "./pages/Suplementos.tsx";
import Roupas from "./pages/Roupas.tsx";
import Acessorios from "./pages/Acessorios.tsx";
import Equipamento from "./pages/Equipamento.tsx";
import Bebidas from "./pages/Bebidas.tsx";
import Alimentos from "./pages/Alimentos.tsx";
import NotFound from "./pages/NotFound.tsx";
import Compartilhar from "./pages/Compartilhar.tsx";
import MeusPedidos from "./pages/MeusPedidos.tsx";
import MinhaConta from "./pages/MinhaConta.tsx";
import ProtectedRoute from "./components/ProtectedRoute";
import PainelRevendedor from "./pages/PainelRevendedor.tsx";
import Partners from "./pages/Partners.tsx";
import PedidoLocal from "./pages/PedidoLocal.tsx";
import Motoqueiro from "./pages/Motoqueiro.tsx";
import Entregadores from "./pages/Entregadores.tsx";
import GlobalBackButton from "./components/GlobalBackButton";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <CartProvider>
          <Toaster />
          <Sonner />
          <CartDrawer />
          <CommandCenterLauncher />
          <GlobalBackButton />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/cadastro" element={<CadastroCNPJ />} />
            <Route path="/cadastro-cliente" element={<CadastroCliente />} />
            <Route path="/mais-vendidos" element={<MaisVendidos />} />
            <Route path="/avaliacoes" element={<Avaliacoes />} />
            <Route path="/comissoes" element={<Comissoes />} />
            <Route path="/pagamento" element={<ProtectedRoute><Pagamento /></ProtectedRoute>} />
            <Route path="/recibo/:code" element={<ProtectedRoute><Recibo /></ProtectedRoute>} />
            <Route path="/meus-pedidos" element={<ProtectedRoute><MeusPedidos /></ProtectedRoute>} />
            <Route path="/minha-conta" element={<ProtectedRoute><MinhaConta /></ProtectedRoute>} />
            <Route path="/revendedor" element={<ProtectedRoute><PainelRevendedor /></ProtectedRoute>} />
            <Route path="/parceiros" element={<Partners />} />
            <Route path="/pedido-local/:id" element={<ProtectedRoute><PedidoLocal /></ProtectedRoute>} />
            <Route path="/motoqueiro" element={<ProtectedRoute><Motoqueiro /></ProtectedRoute>} />
            <Route path="/entregadores" element={<Entregadores />} />
            <Route path="/produto/:id" element={<Produto />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/entrar" element={<Auth />} />
            <Route path="/cadastro-login" element={<Auth />} />
            <Route path="/share" element={<Auth />} />
            <Route path="/convite" element={<Auth />} />
            <Route path="/admin" element={<ProtectedRoute requireAdmin><Admin /></ProtectedRoute>} />
            <Route path="/admin/comando" element={<ProtectedRoute requireAdmin><CommandCenter /></ProtectedRoute>} />
            <Route path="/admin/comando/midia" element={<ProtectedRoute requireAdmin><CampaignMediaStudio /></ProtectedRoute>} />
            <Route path="/suplementos" element={<Suplementos />} />
            <Route path="/roupas" element={<Roupas />} />
            <Route path="/acessorios" element={<Acessorios />} />
            <Route path="/equipamento" element={<Equipamento />} />
            <Route path="/bebidas" element={<Bebidas />} />
            <Route path="/alimentar" element={<Alimentos />} />
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
