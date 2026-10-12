import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/orderUtils";
import { supabase } from "@/integrations/supabase/client";

const CartDrawer = () => {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQty,
    updateStock,
    totalItems,
    totalPrice,
  } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [checkingStock, setCheckingStock] = useState(false);
  const juiceQty = items.reduce(
    (sum, item) => sum + (item.name.startsWith("Suco Natural") ? item.qty : 0),
    0,
  );

  const handleCheckout = async () => {
    const trackedItems = items.filter((item) => item.productId);
    if (trackedItems.length > 0) {
      setCheckingStock(true);
      const productIds = [...new Set(trackedItems.map((item) => item.productId!))];
      const { data, error } = await supabase
        .from("products")
        .select("id,stock,active")
        .in("id", productIds);
      setCheckingStock(false);

      if (error) {
        toast({
          title: "Não foi possível confirmar o estoque",
          description: "Tente novamente antes de seguir para o pagamento.",
          variant: "destructive",
        });
        return;
      }

      const currentById = new Map(
        (data ?? []).map((product) => [
          product.id,
          { stock: Number(product.stock ?? 0), active: Boolean(product.active) },
        ])
      );

      const divergences = trackedItems.filter((item) => {
        const current = currentById.get(item.productId!);
        return !current || !current.active || current.stock < item.qty;
      });

      for (const item of trackedItems) {
        const current = currentById.get(item.productId!);
        updateStock(item.productId!, current?.active ? current.stock : 0);
      }

      if (divergences.length > 0) {
        toast({
          title: "Estoque atualizado",
          description: "A quantidade do seu lote foi ajustada ao estoque disponível. Revise antes de continuar.",
          variant: "destructive",
        });
        return;
      }
    }

    closeCart();
    navigate("/pagamento");
  };


  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent className="bg-background border-border w-full sm:max-w-md flex flex-col">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle className="font-heading font-black text-foreground flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            MEU LOTE
            <span className="text-xs font-semibold text-muted-foreground ml-1">
              ({totalItems} itens)
            </span>
          </SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
              <ShoppingCart className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="font-heading font-bold text-sm text-muted-foreground">
              SEU LOTE ESTÁ VAZIO
            </p>
            <p className="text-xs text-muted-foreground">
              Adicione produtos do catálogo para começar.
            </p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {items.map((item) => (
                <div
                  key={item.productId ?? item.name}
                  className="bg-card border border-border rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-foreground">
                        {item.name}
                      </h4>
                      <p className="text-xs text-primary font-heading font-semibold mt-0.5">
                        {formatCurrency(item.priceNum)} /un
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.name.startsWith("Suco Natural")
                          ? juiceQty >= 10
                            ? "Atacado aplicado"
                            : `Venda avulsa · faltam ${10 - juiceQty} unidade(s) de suco para atacado`
                          : item.qty >= 6
                            ? "Atacado aplicado"
                            : `Faltam ${6 - item.qty} unidade(s) deste produto para atacado`}
                      </p>
                      {item.stock !== undefined && (
                        <p className="text-[11px] text-muted-foreground mt-1">
                          Disponível em estoque: {item.stock}
                        </p>
                      )}
                    </div>
                    <button
                      aria-label={`Remover ${item.name}`}
                      onClick={() => removeItem(item.productId ?? item.name)}
                      className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        aria-label={`Diminuir quantidade de ${item.name}`}
                        disabled={item.qty <= 1}
                        onClick={() => updateQty(item.productId ?? item.name, item.qty - 1)}
                        className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-heading font-bold text-sm text-foreground min-w-[2ch] text-center">
                        {item.qty}
                      </span>
                      <button
                        aria-label={`Aumentar quantidade de ${item.name}`}
                        onClick={() => updateQty(item.productId ?? item.name, item.qty + 1)}
                        disabled={item.stock !== undefined && item.qty >= item.stock}
                        className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-heading font-black text-foreground">
                      R$ {(item.priceNum * item.qty).toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-border pt-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-heading font-bold text-sm text-muted-foreground">
                  TOTAL DO LOTE
                </span>
                <span className="font-heading font-black text-xl text-foreground">
                  R$ {totalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <button
                onClick={closeCart}
                className="w-full flex items-center justify-center gap-2 bg-secondary text-foreground font-heading font-bold text-xs tracking-wider py-3 rounded-lg hover:bg-secondary/70 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                VOLTAR ÀS COMPRAS
              </button>
              <button
                onClick={handleCheckout}
                disabled={checkingStock}
                className="w-full bg-primary text-primary-foreground font-heading font-black text-sm tracking-wider py-4 rounded-lg hover:opacity-90 transition-opacity glow-neon disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checkingStock ? "CONFERINDO ESTOQUE..." : "FINALIZAR PEDIDO"}
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
