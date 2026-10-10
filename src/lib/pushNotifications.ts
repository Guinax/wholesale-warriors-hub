import { supabase } from "@/integrations/supabase/client";

export type PushRole = "courier" | "partner";

function decodeVapidKey(base64: string): Uint8Array {
  const padded = base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
}

export function pushSupport(): { ok: boolean; message: string } {
  if (!window.isSecureContext || !("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window))
    return { ok: false, message: "Este navegador não oferece notificações push. Instale o aplicativo e use HTTPS." };
  if (!import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY)
    return { ok: false, message: "A chave pública de notificações ainda não foi configurada neste ambiente." };
  return { ok: true, message: "" };
}

export async function enablePush(role: PushRole): Promise<void> {
  const support = pushSupport();
  if (!support.ok) throw new Error(support.message);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Entre em sua conta para ativar notificações.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permissão de notificações não concedida.");
  const registration = await navigator.serviceWorker.ready;
  const publicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY as string;
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing || await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: decodeVapidKey(publicKey) as BufferSource,
  });
  const { error } = await supabase.functions.invoke("push-subscriptions", {
    body: { action: "subscribe", role, subscription: subscription.toJSON() },
  });
  if (error) throw new Error("Não foi possível vincular este aparelho à sua conta. Tente novamente.");
}

export async function disablePush(role: PushRole): Promise<void> {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const { error } = await supabase.functions.invoke("push-subscriptions", {
    body: { action: "unsubscribe", role, endpoint: subscription.endpoint },
  });
  if (error) throw new Error("Não foi possível cancelar as notificações no servidor.");
  await subscription.unsubscribe();
}
