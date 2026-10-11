import { useEffect, useRef, useState } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { enablePush, pushSupport, type PushRole } from "@/lib/pushNotifications";

export default function PushPermissionButton({ role, automatic = true, onUserGesture }: { role: PushRole; automatic?: boolean; onUserGesture?: () => void }) {
  const [busy, setBusy] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof Notification === "undefined" ? "unsupported" : Notification.permission,
  );
  const attemptedRef = useRef(false);
  const support = pushSupport();

  const activate = async (showErrors = true) => {
    if (busy || enabled || !support.ok) return;
    if (typeof Notification !== "undefined" && Notification.permission === "denied") {
      if (showErrors) toast.error("As notificações estão bloqueadas neste aparelho. Libere as notificações do app nas configurações do Android e tente novamente.");
      return;
    }
    setBusy(true);
    try {
      await enablePush(role);
      setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
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

    // Browsers require a user gesture for the first permission request.
    // Keep the button visible until subscription is confirmed by the server.
  }, [automatic, support.ok]);

  useEffect(() => {
    if (!support.ok || typeof Notification === "undefined") return;
    const refreshPermission = () => {
      const current = Notification.permission;
      setPermission(current);
      if (current === "granted" && !enabled && !busy) void activate(false);
    };
    document.addEventListener("visibilitychange", refreshPermission);
    window.addEventListener("focus", refreshPermission);
    return () => {
      document.removeEventListener("visibilitychange", refreshPermission);
      window.removeEventListener("focus", refreshPermission);
    };
  }, [support.ok, enabled, busy]);

  if (enabled) {
    return null;
  }

  if (!support.ok) return <p className="text-xs text-muted-foreground">{support.message}</p>;

  return (
    <div className="flex flex-col items-start gap-2">
      <Button type="button" variant="outline" disabled={busy} onClick={() => { onUserGesture?.(); void activate(true); }}>
        <BellRing className="mr-2 h-4 w-4" />
        {busy ? "Ativando..." : "Permitir avisos de pedidos"}
      </Button>
      <p className="text-xs text-muted-foreground">
        {permission === "denied"
          ? "Notificações bloqueadas no Android. Abra Configurações > Apps > Mansão Maromba (ou Chrome) > Notificações e toque em Permitir. Ao voltar para o app, a ativação será detectada automaticamente."
          : "Autorize uma vez neste aparelho. Depois os avisos ficam automáticos."}
      </p>
    </div>
  );
}
