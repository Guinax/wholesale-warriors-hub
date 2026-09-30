import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Check = { title: string; detail: string; ready: boolean; tab: string };

export default function OperationReadiness({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [productsResult, partnersResult, shippingResult] = await Promise.all([
        supabase.from("products").select("id,image_url,stock,weight_kg,width_cm,height_cm,length_cm").eq("active", true),
        supabase.from("partner_stores").select("id", { count: "exact", head: true }),
        supabase.functions.invoke("melhor-envio-callback", { body: { action: "status" } }),
      ]);
      if (productsResult.error || partnersResult.error) throw new Error("Não foi possível consultar o catálogo e as lojas. Atualize para tentar novamente.");
      const products = productsResult.data ?? [];
      const pictured = products.filter((p) => Boolean(p.image_url?.trim())).length;
      const stocked = products.filter((p) => p.stock > 0).length;
      const measured = products.filter((p) => [p.weight_kg, p.width_cm, p.height_cm, p.length_cm].every((v) => Number(v) > 0)).length;
      const total = products.length;
      const partners = partnersResult.count ?? 0;
      const shipping = shippingResult.data as { connected?: boolean; configured?: boolean } | null;
      setChecks([
        { title: "Produtos ativos", detail: `${total} produto(s) no catálogo.`, ready: total > 0, tab: "products" },
        { title: "Fotos dos produtos", detail: `${pictured} de ${total} com imagem cadastrada. Use fotos reais correspondentes ao produto.`, ready: total > 0 && pictured === total, tab: "products" },
        { title: "Estoque para venda", detail: `${stocked} de ${total} com saldo. Confira o estoque físico antes de disponibilizar unidades.`, ready: stocked > 0, tab: "inventory" },
        { title: "Peso e dimensões", detail: `${measured} de ${total} com medidas completas para cotação pela transportadora.`, ready: total > 0 && measured === total, tab: "shipping" },
        { title: "Melhor Envio", detail: shippingResult.error ? "Não foi possível consultar a conexão. Confira em Logística." : shipping?.connected ? "Autorização registrada. Valide uma cotação com produtos e medidas reais." : shipping?.configured ? "Credenciais configuradas. Falta autorizar a conta em Logística." : "Configure as credenciais e autorize a conta em Logística. O frete regional permanece disponível.", ready: !shippingResult.error && Boolean(shipping?.connected), tab: "shipping" },
        { title: "Rede de revendedores", detail: `${partners} loja(s) cadastrada(s). Para entrega local, configure aprovação, área atendida, estoque e entregador.`, ready: partners > 0, tab: "partners" },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha ao conferir a operação.");
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <section className="space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">Conferência da operação</h2><p className="text-sm text-muted-foreground">Pendências do cadastro e das integrações. Esta conferência não substitui o teste de compra, pagamento e entrega.</p></div><Button variant="outline" disabled={loading} onClick={() => void load()} aria-label="Atualizar conferência"><RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /></Button></div>
    {error && <Card className="p-4 text-destructive" role="alert">{error}</Card>}
    {loading && <p role="status" className="text-sm">Conferindo dados...</p>}
    {!error && checks.map((check) => <Card key={check.title} className="p-4 flex gap-3 items-start">
      {check.ready ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" aria-label="Cadastrado" /> : <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" aria-label="Pendente" />}
      <div className="flex-1 space-y-2"><h3 className="font-semibold">{check.title}</h3><p className="text-sm text-muted-foreground">{check.detail}</p><Button variant="outline" size="sm" onClick={() => onNavigate(check.tab)}>Conferir cadastro</Button></div>
    </Card>)}
    <Card className="p-4 text-sm space-y-2"><h3 className="font-semibold">Validação antes de abrir as vendas</h3><p>Confirme o e-mail de cadastro, uma compra com InfinitePay, a baixa de estoque e o acompanhamento da entrega. Os repasses aos parceiros são registrados no painel após a transferência feita pela administração.</p></Card>
  </section>;
}
