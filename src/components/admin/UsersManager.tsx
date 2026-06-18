import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Users, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Profile = {
  id: string;
  user_id: string;
  user_code: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  created_at: string;
};

const UsersManager = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      toast.error("Erro ao carregar usuários: " + error.message);
      return;
    }
    setProfiles((data as Profile[]) || []);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      p.email?.toLowerCase().includes(q) ||
      p.full_name?.toLowerCase().includes(q) ||
      p.user_code?.toLowerCase().includes(q) ||
      p.phone?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-heading font-bold text-lg">
            Usuários cadastrados ({profiles.length})
          </h2>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, ID, e-mail..."
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          {loading ? "Carregando..." : "Nenhum usuário encontrado."}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((p) => (
            <Card key={p.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-heading font-bold text-sm truncate">
                    {p.full_name || "Sem nome"}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                </div>
                <Badge variant="secondary" className="font-mono text-[10px] flex-shrink-0">
                  {p.user_code}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                {p.phone && <span>📱 {p.phone}</span>}
                <span>
                  Cadastrado: {new Date(p.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsersManager;
