import { Minus, Plus, ShoppingCart, X, ZoomIn } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/contexts/CartContext";

interface ProductCardProps {
  productId?: string;
  badge?: string;
  badgeColor?: string;
  name: string;
  unitPrice: string;
  wholesalePrice: string;
  minQty: number;
  stock?: number;
  image?: string;
  viewMode?: "grid" | "list";
}

const ProductCard = ({
  productId,
  badge,
  badgeColor = "bg-primary",
  name,
  unitPrice,
  wholesalePrice,
  stock,
  image,
  viewMode = "grid",
}: ProductCardProps) => {
  const [qty, setQty] = useState(1);
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const [isImageOpen, setIsImageOpen] = useState(false);
  const { addItem } = useCart();

  const imageAvailable = Boolean(image && image !== failedImage);

  const handleAdd = () => {
    if (stock !== undefined && stock < qty) return;
    addItem({ productId, name, unitPrice, wholesalePrice, qty, minQty: 1, stock });
    setQty(1);
  };

  const imageLightbox =
    isImageOpen && imageAvailable ? (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
        role="dialog"
        aria-modal="true"
        aria-label={`Imagem ampliada de ${name}`}
        onClick={() => setIsImageOpen(false)}
      >
        <button
          type="button"
          aria-label="Fechar imagem ampliada"
          onClick={() => setIsImageOpen(false)}
          className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/70 text-white backdrop-blur transition hover:bg-black"
        >
          <X className="h-6 w-6" />
        </button>

        <img
          src={image}
          alt={name}
          onClick={(event) => event.stopPropagation()}
          className="max-h-[90vh] max-w-[95vw] select-none object-contain drop-shadow-2xl"
        />
      </div>
    ) : null;

  if (viewMode === "list") {
    return (
      <>
        <div className="bg-card rounded-xl border border-border overflow-hidden flex hover:border-primary/40 transition-all duration-300">
          <button
            type="button"
            aria-label={imageAvailable ? `Ampliar imagem de ${name}` : undefined}
            onClick={() => imageAvailable && setIsImageOpen(true)}
            disabled={!imageAvailable}
            className="relative w-24 h-24 flex-shrink-0 bg-gradient-to-br from-secondary to-surface-elevated flex items-center justify-center overflow-hidden disabled:cursor-default enabled:cursor-zoom-in"
          >
            {imageAvailable ? (
              <>
                <img
                  src={image}
                  alt={name}
                  onError={() => setFailedImage(image!)}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <span className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white">
                  <ZoomIn className="h-3.5 w-3.5" />
                </span>
              </>
            ) : (
              <span className="text-[9px] text-muted-foreground text-center px-2">
                Foto em atualização
              </span>
            )}

            {badge && (
              <span
                className={`absolute top-1 left-1 ${badgeColor} text-primary-foreground text-[8px] font-heading font-bold tracking-wider px-1.5 py-0.5 rounded-md`}
              >
                {badge}
              </span>
            )}
          </button>

          <div className="flex-1 p-3 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-xs tracking-wide text-foreground truncate">
                {name}
              </h3>
              <p className="text-[10px] text-muted-foreground">
                {qty >= 6 ? "Atacado aplicado" : "Preço unitário"}
              </p>
              <span className="font-heading font-black text-base text-foreground">
                {qty >= 6 ? wholesalePrice : unitPrice}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  aria-label={`Diminuir quantidade de ${name}`}
                  disabled={qty <= 1}
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-heading font-bold text-xs text-foreground min-w-[2ch] text-center">
                  {qty}
                </span>
                <button
                  aria-label={`Aumentar quantidade de ${name}`}
                  onClick={() => setQty((q) => q + 1)}
                  disabled={stock !== undefined && qty >= stock}
                  className="w-7 h-7 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                aria-label={`Adicionar ${name} ao carrinho`}
                onClick={handleAdd}
                disabled={stock !== undefined && stock < qty}
                className="w-9 h-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                {stock !== undefined && stock < 1 ? "—" : <ShoppingCart className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {imageLightbox}
      </>
    );
  }

  return (
    <>
      <div className="bg-card rounded-xl border border-border overflow-hidden group hover:border-primary/40 hover:shadow-[0_0_30px_hsl(45_100%_50%/0.08)] transition-all duration-300">
        <button
          type="button"
          aria-label={imageAvailable ? `Ampliar imagem de ${name}` : undefined}
          onClick={() => imageAvailable && setIsImageOpen(true)}
          disabled={!imageAvailable}
          className="relative aspect-square w-full bg-gradient-to-br from-secondary to-surface-elevated flex items-center justify-center overflow-hidden disabled:cursor-default enabled:cursor-zoom-in"
        >
          {imageAvailable ? (
            <>
              <img
                src={image}
                alt={name}
                onError={() => setFailedImage(image!)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                loading="lazy"
              />
              <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/65 text-white opacity-90 backdrop-blur-sm transition group-hover:scale-110">
                <ZoomIn className="h-4 w-4" />
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground text-center px-4">
              Foto em atualização
            </span>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-card/50 to-transparent pointer-events-none" />

          {badge && (
            <span
              className={`absolute top-3 left-3 ${badgeColor} text-primary-foreground text-[10px] font-heading font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md pointer-events-none`}
            >
              {badge}
            </span>
          )}

          {stock !== undefined && stock < 1 && (
            <span className="absolute top-3 right-3 bg-background/90 text-foreground border border-border text-[10px] font-heading font-bold tracking-wider px-2.5 py-1 rounded-md shadow-md pointer-events-none">
              ESTOQUE EM ATUALIZAÇÃO
            </span>
          )}
        </button>

        <div className="p-4 space-y-3">
          <h3 className="font-heading font-bold text-sm tracking-wide text-foreground">{name}</h3>

          <p className="text-xs text-muted-foreground">
            Unidade individual: <span>{unitPrice}</span>
          </p>

          <div className="flex items-baseline gap-2">
            <span className="text-[10px] font-heading font-semibold tracking-wider text-primary">
              {qty >= 6 ? "ATACADO APLICADO" : "PREÇO UNITÁRIO"}
            </span>
            <span className="font-heading font-black text-xl text-foreground">
              {qty >= 6 ? wholesalePrice : unitPrice}
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Atacado: {wholesalePrice}/un a partir de 6 unidades deste produto.
          </p>

          <div className="flex items-center gap-3">
            <button
              aria-label={`Diminuir quantidade de ${name}`}
              disabled={qty <= 1}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="font-heading font-bold text-sm text-foreground min-w-[2ch] text-center">
              {qty}
            </span>

            <button
              aria-label={`Aumentar quantidade de ${name}`}
              onClick={() => setQty((q) => q + 1)}
              disabled={stock !== undefined && qty >= stock}
              className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            aria-label={`Adicionar ${name} ao carrinho`}
            onClick={handleAdd}
            disabled={stock !== undefined && stock < qty}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-heading font-bold text-xs tracking-wider py-3 rounded-lg hover:opacity-90 transition-opacity hover:shadow-[0_0_20px_hsl(45_100%_50%/0.3)]"
          >
            <ShoppingCart className="w-4 h-4" />
            {stock !== undefined && stock < 1 ? "ESTOQUE EM ATUALIZAÇÃO" : "ADICIONAR AO CARRINHO"}
          </button>
        </div>
      </div>

      {imageLightbox}
    </>
  );
};

export default ProductCard;
