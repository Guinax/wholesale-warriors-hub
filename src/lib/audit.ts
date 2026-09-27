import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "login"
  | "logout"
  | "signup"
  | "order_created"
  | "order_updated"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "admin_access"
  | "page_view";

export async function logAudit(
  action: AuditAction | string,
  opts: {
    entity?: string;
    entity_id?: string;
    details?: Record<string, any>;
  } = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs" as any).insert({
      user_id: user?.id ?? null,
      user_email: user?.email ?? null,
      action,
      entity: opts.entity ?? null,
      entity_id: opts.entity_id ?? null,
      details: opts.details ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
  } catch (e) {
    console.warn("audit log failed", e);
  }
}
