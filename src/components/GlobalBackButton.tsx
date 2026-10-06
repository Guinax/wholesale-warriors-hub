import { ArrowLeft } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const excluded = [
  "/",
  "/.lovable/oauth/consent",
];

export default function GlobalBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  if (excluded.includes(location.pathname)) return null;

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/", { replace: true });
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label="Voltar"
      className="fixed left-3 top-16 z-40 inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background/95 px-3 text-sm font-bold text-foreground shadow-lg backdrop-blur hover:border-primary/50 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Voltar</span>
    </button>
  );
}
