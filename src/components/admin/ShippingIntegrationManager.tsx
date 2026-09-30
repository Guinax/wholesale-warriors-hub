import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ExternalLink, Truck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type Status = {
  configured: boolean;
  connected: boolean;
  expires_at: string | null;
  refresh_expires_at: string | null;
  callback_url: string | null;
  environment: string;
};

const EXPECTED_CALLBACK = "https://svkatjljeyyuobayjqjv.supabase.co/functions/v1/melhor-envio-callback";

export default function ShippingIntegrationManager() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke("melhor-envio-callback", {
      body: { action: "status" },
    });
    setLoading(false);
    if (error) {
      toast.error("Não foi possível consultar a integração do Melhor Envio.");
      return;
    }
    setStatus(data as Status);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const connect = async () => {
    setConnecting(true);
    const { data, error } = await supabase.functions.invoke("melhor-envio-callback", {
      body: { action: "start" },
    });
    setConnecting(false);
    if (error || !data?.authorization_url) {
      toast.error(data?.error ?? "Configure as credenciais do Melhor Envio no Supabase antes de conectar.");
      return;
    }
    const opened = window.open(String(data.authorization_url), "_blank", "noopener,noreferrer");
    if (!opened) window.location.href = String(data.authorization_url);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Truck className="w-5 h-5 text-primary" />
            <div>
              <h2 className="font-semibold">Melhor Envio</h2>
              <p className="text-xs text-muted-foreground">
                Cotação real de frete para pedidos enviados pela central.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge variant={status?.connected ? "default" : "secondary"}>
              {status?.connected ? "Conectado" : status?.configured ? "Aguardando autorização" : "Credenciais pendentes"}
            </Badge>
            <Button variant="outline" size="icon" onClick={() => void load()} disabled={loading} aria-label="Atualizar integração">
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        <div className="rounded-lg border p-3 text-xs space-y-2">
          <p><strong>Callback do aplicativo:</strong></p>
          <p className="font-mono break-all">{status?.callback_url || EXPECTED_CALLBACK}</p>
          <p><strong>Ambiente:</strong> {status?.environment === "sandbox" ? "Sandbox" : "Produção"}</p>
          {status?.expires_at && <p><strong>Access token:</strong> válido até {new Date(status.expires_at).toLocaleString("pt-BR")}</p>}
          {status?.refresh_expires_at && <p><strong>Refresh token:</strong> válido até {new Date(status.refresh_expires_at).toLocaleString("pt-BR")}</p>}
        </div>

        {!status?.configured && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs space-y-2">
            <p className="font-semibold">Faltam os secrets no Supabase:</p>
            <p className="font-mono break-all">MELHOR_ENVIO_CLIENT_ID</p>
            <p className="font-mono break-all">MELHOR_ENVIO_CLIENT_SECRET</p>
            <p className="font-mono break-all">MELHOR_ENVIO_REDIRECT_URI</p>
            <p className="font-mono break-all">MELHOR_ENVIO_USER_AGENT</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => void connect()} disabled={connecting || !status?.configured}>
            <ExternalLink className="w-4 h-4" />
            {status?.connected ? "Reconectar Melhor Envio" : "Conectar Melhor Envio"}
          </Button>
        </div>
      </Card>

      <Card className="p-4 flex gap-3">
        <ShieldCheck className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground space-y-1">
          <p>Access token e refresh token ficam em tabela privada e nunca são enviados ao navegador.</p>
          <p>Se o Melhor Envio ou as dimensões do produto não estiverem disponíveis, o checkout mantém automaticamente o frete regional atual.</p>
        </div>
      </Card>
    </div>
  );
}
