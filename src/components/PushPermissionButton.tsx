import { useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { enablePush, pushSupport, type PushRole } from "@/lib/pushNotifications";

export default function PushPermissionButton({ role, automatic = true }: { role: PushRole; automatic?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const attemptedRef = useRef(false);
  const support = pushSupport();

  const activate = async (showErrors = true) => {
    if (busy || enabled || !support.ok) return;
    setBusy(true);
    try {
      await enablePush(role);
      setEnabled(true);
      toast.success("Avisos ativados neste aparelho.");
    } catch (error) {
      if (showErrors) toast.error(error instanceof Error ? error.message : "Não foi possível ativar notificações.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!automatic || attemptedRef.current || !support.ok || typeof Notification === "undefined") return;
    attemptedRef.current = true;

    if (Notification.permission === "granted") {
      void activate(false);
      return;
    }

    if (Notification.permission === "default") {
      // Browsers may require a user gesture before showing this native prompt.
      // Try on first approved access; the fallback button remains only until permission is decided.
      void activate(false);
    }
  }, [automatic, support.ok]);

  if (enabled || (support.ok && typeof Notification !== "undefined" && Notification.permission === "granted")) {
    return null;
  }

  if (!support.ok) return <p className="text-xs text-muted-foreground">{support.message}</p>;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={() => void activate(true)}>
        <BellRing className="mr-2 h-4 w-4" />
        {busy ? "Ativando..." : "Permitir avisos de pedidos"}
      </Button>
      <p className="text-xs text-muted-foreground">Autorize uma vez neste aparelho. Depois os avisos ficam automáticos.</p>
    </div>
  );
}
