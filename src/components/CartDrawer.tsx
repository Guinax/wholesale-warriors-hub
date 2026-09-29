import { useState } from "react";
import { Minus, Plus, Trash2, ShoppingCart, ArrowLeft, Truck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/orderUtils";
import {
  lookupCep,
  maskCepValue,
  onlyDigitsCep,
  shippingCostFor,
  shippingEtaFor,
} from "@/lib/shipping";

const CartDrawer = () => {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQty,
    totalItems,
    totalPrice,
    shipping,
    setShipping,
    shippingCost,
    grandTotal,
  } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [cep, setCep] = useState(shipping?.cep ?? "");
  const [calculating, setCalculating] = useState(false);

  const handleCalcFrete = async () => {
    if (onlyDigitsCep(cep).length !== 8) {
      toast({ title: "CEP inválido", description: "Digite os 8 dígitos do CEP.", variant: "destructive" });
      return;
    }
    setCalculating(true);
    const info = await lookupCep(cep);
    setCalculating(false);
    if (!info) {
      toast({ title: "CEP não encontrado", description: "Confira o CEP e tente novamente.", variant: "destructive" });
      return;
    }
    setShipping({
      ...info,
      cost: shippingCostFor(info.state, totalPrice, totalItems),
      eta: shippingEtaFor(info.state),
    });
    toast({ title: "Frete calculado", description: `${info.city}/${info.state} · entrega em ${shippingEtaFor(info.state)}` });
  };

  const handleCheckout = () => {
    if (!shipping) {
      toast({
        title: "Informe o CEP de entrega",
        description: "Calcule o frete antes de ir para o pagamento.",
        variant: "destructive",
      });
      return;
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
                  key={item.name}
                  className="bg-card border border-border rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-heading font-bold text-sm text-foreground">
                        {item.name}
                      </h4>
                      <p className="text-xs text-primary font-heading font-semibold mt-0.5">
                        {item.wholesalePrice} /un
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.name)}
                      className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQty(item.name, item.qty - 1)}
                        className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="font-heading font-bold text-sm text-foreground min-w-[2ch] text-center">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(item.name, item.qty + 1)}
                        className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
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
              <div className="rounded-xl border border-border bg-card p-3 space-y-2">
                <div className="flex items-center gap-2 text-xs font-heading font-bold text-foreground">
                  <Truck className="w-4 h-4 text-primary" /> CALCULAR FRETE
                </div>
                <div className="flex gap-2">
                  <input
                    value={cep}
                    inputMode="numeric"
                    placeholder="00000-000"
                    onChange={(e) => setCep(maskCepValue(e.target.value))}
                    className="min-w-0 flex-1 rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                  />
                  <button onClick={handleCalcFrete} disabled={calculating} className="rounded-md bg-secondary px-3 text-xs font-heading font-bold text-foreground disabled:opacity-50">
                    {calculating ? "..." : "CALCULAR"}
                  </button>
                </div>
                {shipping && (
                  <div className="text-[11px] text-muted-foreground">
                    {shipping.city}/{shipping.state} · {shipping.eta} · <strong className="text-foreground">{formatCurrency(shippingCost)}</strong>
                  </div>
                )}
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
                className="w-full bg-primary text-primary-foreground font-heading font-black text-sm tracking-wider py-4 rounded-lg hover:opacity-90 transition-opacity glow-neon"
              >
                IR PARA PAGAMENTO
              </button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default CartDrawer;
