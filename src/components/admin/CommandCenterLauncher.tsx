import { useLocation, useNavigate } from "react-router-dom";
import { BarChart3, Megaphone } from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Button } from "@/components/ui/button";

const CommandCenterLauncher = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAdmin, loading } = useAdminAuth();

  if (loading || !isAdmin || location.pathname !== "/admin") return null;

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col gap-2 items-end">
      <Button
        variant="outline"
        className="shadow-lg bg-background/95 backdrop-blur"
        onClick={() => navigate("/admin/comando/midia")}
      >
        <Megaphone className="w-4 h-4" /> Mídia de campanhas
      </Button>
      <Button
        className="shadow-xl font-heading font-black"
        onClick={() => navigate("/admin/comando")}
      >
        <BarChart3 className="w-4 h-4" /> Centro de Comando
      </Button>
    </div>
  );
};

export default CommandCenterLauncher;
