import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";

type OAuthRecord = Record<string, unknown> & {
  message?: string;
  redirect_url?: string;
  redirect_to?: string;
  client?: { name?: string };
};

// Local typed wrapper for the beta @supabase/supabase-js OAuth namespace.
const oauth = (supabase.auth as unknown as {
  oauth: {
    getAuthorizationDetails: (id: string) => Promise<{ data: OAuthRecord | null; error: OAuthRecord | null }>;
    approveAuthorization: (id: string) => Promise<{ data: OAuthRecord | null; error: OAuthRecord | null }>;
    denyAuthorization: (id: string) => Promise<{ data: OAuthRecord | null; error: OAuthRecord | null }>;
  };
}).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Parâmetro authorization_id ausente.");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) {
        setError(error.message ?? "Não foi possível carregar a autorização.");
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      setError(error.message ?? "Falha ao processar autorização.");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("O servidor de autorização não retornou um redirecionamento.");
      return;
    }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-full bg-primary/10">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-bold">Conectar ao Adega Maromba</h1>
        </div>

        {error && (
          <div className="text-sm text-destructive text-center">{error}</div>
        )}

        {!error && !details && (
          <p className="text-sm text-muted-foreground text-center">Carregando…</p>
        )}

        {details && (
          <>
            <div className="space-y-3 text-sm">
              <p>
                <span className="font-semibold">{details.client?.name ?? "Um aplicativo"}</span>
                {" "}quer se conectar à sua conta na Adega Maromba.
              </p>
              <p className="text-muted-foreground">
                Isso permite que ele use as ferramentas do app como você — consultar produtos, seus pedidos e status de entrega.
              </p>
              <p className="text-xs text-muted-foreground">
                Isto não desativa nem contorna as políticas de acesso do app.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1"
                disabled={busy}
                onClick={() => decide(true)}
              >
                Aprovar
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
