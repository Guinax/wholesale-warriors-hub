import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

type Props = { children: ReactNode; requireAdmin?: boolean };

const ProtectedRoute = ({ children, requireAdmin = false }: Props) => {
  const location = useLocation();
  const [userId, setUserId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [adminStatus, setAdminStatus] = useState<"pending" | "allowed" | "denied">("pending");

  useEffect(() => {
    let active = true;
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setUserId(session?.user?.id ?? null);
      setLoadingSession(false);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user?.id ?? null);
      setLoadingSession(false);
    }).catch(() => {
      if (active) setLoadingSession(false);
    });
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!requireAdmin || !userId) return;
    let active = true;
    setAdminStatus("pending");
    void supabase.from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data, error }) => {
        if (active) setAdminStatus(!error && data ? "allowed" : "denied");
      }, () => {
        if (active) setAdminStatus("denied");
      });
    return () => { active = false; };
  }, [requireAdmin, userId]);

  if (loadingSession || (requireAdmin && userId && adminStatus === "pending")) {
    return <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>;
  }
  if (!userId) {
    const next = location.pathname + location.search + location.hash;
    return <Navigate to={`/auth?next=${encodeURIComponent(next)}`} replace />;
  }
  if (requireAdmin && adminStatus !== "allowed") return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default ProtectedRoute;
