import { useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { enablePush, pushSupport, type PushRole } from "@/lib/pushNotifications";

export default function PushPermissionButton({ role }: { role: PushRole }) {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const support = pushSupport();
  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" disabled={busy || !support.ok || enabled} onClick={async () => {
        setBusy(true);
        try {
          await enablePush(role);
          setEnabled(true);
          toast.success("Este aparelho foi habilitado para alertas.");
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Não foi possível ativar notificações.");
        } finally { setBusy(false); }
      }}>
        <BellRing className="mr-2 h-4 w-4" />
        {busy ? "Ativando..." : enabled ? "Alertas ativados neste aparelho" : "Ativar avisos de novos pedidos"}
      </Button>
      {!support.ok && <p className="text-xs text-muted-foreground">{support.message}</p>}
    </div>
  );
}
