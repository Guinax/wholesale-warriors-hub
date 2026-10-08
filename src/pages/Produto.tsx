import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ShoppingCart, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatCurrency } from "@/lib/orderUtils";

type Product = {
  id: string;
  name: string;
  category: string;
  wholesale_price: number;
  unit_price: number;
  min_qty: number;
  stock: number;
  image_url: string | null;
  badge: string | null;
  active: boolean;
};

const Produto = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem, totalItems, openCart } = useCart();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!id) return;
      const { data } = await supabase
        .from("products")
        .select("id,name,category,wholesale_price,unit_price,min_qty,stock,image_url,badge,active")
        .eq("id", id)
        .eq("active", true)
        .maybeSingle();
      if (!active) return;
      const next = (data ?? null) as Product | null;
      setProduct(next);
      setQty(1);
      setLoading(false);
      if (next) document.title = `${next.name} | Adega Maromba`;
    })();
    return () => { active = false; };
  }, [id]);

  const addToCart = () => {
    if (!product || product.stock < 1) return;
    const safeQty = Math.max(1, Math.min(product.stock, qty));
    addItem({
      productId: product.id,
      name: product.name,
      unitPrice: formatCurrency(product.unit_price),
      wholesalePrice: formatCurrency(product.wholesale_price),
      qty: safeQty,
      minQty: 1,
      stock: product.stock,
    });
  };

  if (loading) return <div className="min-h-screen grid place-items-center bg-background">Carregando produto...</div>;

  if (!product) {
    return (
      <div className="min-h-screen bg-background grid place-items-center p-6">
        <Card className="p-6 text-center max-w-md space-y-4">
          <h1 className="font-heading font-black text-xl">PRODUTO NÃO ENCONTRADO</h1>
          <p className="text-sm text-muted-foreground">Este item pode ter sido removido ou estar temporariamente indisponível.</p>
          <Button asChild><Link to="/">Voltar para a loja</Link></Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-xl">
        <div className="container h-14 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Voltar">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <Link to="/" className="font-heading font-black text-xs tracking-wider">ADEGA MAROMBA</Link>
          <button onClick={openCart} className="relative p-2" aria-label="Carrinho">
            <ShoppingCart className="w-5 h-5" />
            {totalItems > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold grid place-items-center">{totalItems}</span>}
          </button>
        </div>
      </header>

      <main className="container py-8 grid lg:grid-cols-2 gap-8 items-start max-w-5xl">
        <Card className="overflow-hidden">
          <div className="aspect-square bg-muted grid place-items-center">
            {product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" /> : <span className="text-sm text-muted-foreground">Produto sem imagem</span>}
          </div>
        </Card>

        <div className="space-y-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-primary font-heading font-bold">{product.category}</p>
            <h1 className="font-heading font-black text-3xl md:text-5xl leading-tight mt-2">{product.name}</h1>
            {product.badge && <p className="inline-block mt-3 bg-secondary rounded-full px-3 py-1 text-xs font-semibold">{product.badge}</p>}
          </div>

          <Card className="p-5 space-y-4">
            <div>
              <p className="text-xs text-muted-foreground">{qty >= 6 ? "Preço atacado aplicado" : "Preço unitário"}</p>
              <p className="text-3xl font-black text-primary">{formatCurrency(qty >= 6 ? product.wholesale_price : product.unit_price)}</p>
              <p className="text-xs text-muted-foreground mt-1">Mínimo: 1 unidade · Atacado automático a partir de 6 unidades deste produto</p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" aria-label="Diminuir quantidade" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))}>−</Button>
              <div className="min-w-16 text-center font-black text-lg">{qty}</div>
              <Button variant="outline" size="icon" aria-label="Aumentar quantidade" disabled={qty >= product.stock} onClick={() => setQty((q) => Math.min(product.stock, q + 1))}>+</Button>
              <span className="text-xs text-muted-foreground">{product.stock > 0 ? `Estoque: ${product.stock}` : "Estoque em atualização"}</span>
            </div>

            <Button size="lg" className="w-full font-heading font-black" onClick={addToCart} disabled={product.stock < 1}>
              <ShoppingCart className="w-4 h-4" /> {product.stock < 1 ? "ESTOQUE EM ATUALIZAÇÃO" : "ADICIONAR AO CARRINHO"}
            </Button>
          </Card>

          <div className="flex items-start gap-3 text-sm text-muted-foreground border rounded-xl p-4">
            <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
            <p>Compra feita pela plataforma oficial Adega Maromba. O pagamento é concluído no checkout seguro integrado ao pedido.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Produto;
