import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Download, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const Compartilhar = () => {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    document.title = "Compartilhar Cadastro | Família Maromba";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://wholesale-warriors-hub.vercel.app";
    setShareUrl(`${origin}/cadastro-login`);
  }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    toast.success("Link copiado!");
  };

  const downloadQR = () => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "familia-maromba-qrcode.png";
    a.click();
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Representante Oficial Família Maromba",
          text: "Cadastre-se e acesse preços de atacado exclusivos!",
          url: shareUrl,
        });
      } catch (error) {
        // O cancelamento da janela nativa de compartilhamento é esperado e não exige ação.
        if (error instanceof DOMException && error.name !== "AbortError") {
          console.error("Falha ao abrir o compartilhamento nativo", error);
        }
      }
    } else {
      copyLink();
    }
  };

  const shareWhatsApp = () => {
    const msg = encodeURIComponent(
      `🔥 Representante Oficial Família Maromba\n\nCadastre-se e garanta preços de atacado exclusivos:\n${shareUrl}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        <div className="text-center space-y-2">
          <h1 className="text-2xl font-heading font-black tracking-tight">
            COMPARTILHAR CADASTRO
          </h1>
          <p className="text-sm text-muted-foreground">
            Aponte a câmera para o QR Code ou compartilhe o link
          </p>
        </div>

        <div ref={wrapRef} className="flex justify-center">
          <div className="bg-white p-4 rounded-xl shadow-lg">
            {shareUrl && (
              <QRCodeCanvas
                value={shareUrl}
                size={240}
                level="H"
                includeMargin={false}
                imageSettings={{
                  src: logo,
                  height: 44,
                  width: 44,
                  excavate: true,
                }}
              />
            )}
          </div>
        </div>

        <div className="bg-secondary border border-border rounded-lg p-3 text-xs break-all text-center text-muted-foreground">
          {shareUrl}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={copyLink}>
            <Copy className="w-4 h-4 mr-2" /> Copiar link
          </Button>
          <Button variant="outline" onClick={downloadQR}>
            <Download className="w-4 h-4 mr-2" /> Baixar QR
          </Button>
        </div>

        <Button onClick={shareWhatsApp} className="w-full bg-[#25D366] hover:bg-[#25D366]/90 text-white">
          <MessageCircle className="w-4 h-4 mr-2" /> Compartilhar no WhatsApp
        </Button>

        <Button onClick={nativeShare} variant="secondary" className="w-full">
          <Share2 className="w-4 h-4 mr-2" /> Mais opções
        </Button>

        <Button onClick={() => navigate("/cadastro-login")} className="w-full">
          Ir para cadastro / login
        </Button>
      </Card>
    </div>
  );
};

export default Compartilhar;
