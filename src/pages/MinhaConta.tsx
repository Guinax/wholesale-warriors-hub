import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Save, UserRound } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const onlyDigits = (v: string) => v.replace(/\D/g, "");
const maskCep = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d{0,3})/, (_, a, b) => b ? `${a}-${b}` : a);
const maskCpf = (v: string) => onlyDigits(v).slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskCnpj = (v: string) => onlyDigits(v).slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d)/, "$1-$2");

const MinhaConta = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", cpf: "", cnpj: "", address_zip: "", address_street: "", address_number: "", address_complement: "", address_city: "", address_state: "" });

  useEffect(() => { (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/auth?next=/minha-conta"); return; }
    const { data, error } = await supabase.from("profiles").select("full_name,email,phone,cpf,cnpj,address_zip,address_street,address_number,address_complement,address_city,address_state").eq("user_id", user.id).maybeSingle();
    if (error) toast({ title: "Não foi possível carregar seus dados", description: error.message, variant: "destructive" });
    setForm({ full_name:data?.full_name??"", email:data?.email??user.email??"", phone:data?.phone??"", cpf:data?.cpf??"", cnpj:data?.cnpj??"", address_zip:data?.address_zip??"", address_street:data?.address_street??"", address_number:data?.address_number??"", address_complement:data?.address_complement??"", address_city:data?.address_city??"", address_state:data?.address_state??"" });
    setLoading(false);
  })(); }, [navigate, toast]);

  const set = (key: keyof typeof form, value: string) => setForm(f => ({...f,[key]:value}));

  const save = async () => {
    setSaving(true);
    const { data:{user}, error: authError } = await supabase.auth.getUser();
    if(authError || !user){ setSaving(false); navigate("/auth?next=/minha-conta"); return; }
    const email = (form.email || user.email || "").trim();
    if (!email) { setSaving(false); toast({title:"E-mail obrigatório",variant:"destructive"}); return; }

    const { error } = await supabase.from("profiles").upsert({
      user_id: user.id,
      email,
      full_name: form.full_name.trim() || null,
      phone: form.phone.trim() || null,
      cpf: form.cpf.trim() || null,
      cnpj: form.cnpj.trim() || null,
      address_zip: form.address_zip.trim() || null,
      address_street: form.address_street.trim() || null,
      address_number: form.address_number.trim() || null,
      address_complement: form.address_complement.trim() || null,
      address_city: form.address_city.trim() || null,
      address_state: form.address_state.trim().toUpperCase() || null,
    }, { onConflict: "user_id" }).select("user_id").single();

    setSaving(false);
    if(error){ toast({title:"Não foi possível salvar",description:error.message,variant:"destructive"}); return; }
    toast({title:"Dados salvos",description:"Confirmado no banco. O checkout usará estes dados nas próximas compras."});
  };

  if(loading) return <div className="min-h-screen bg-background flex items-center justify-center text-sm text-muted-foreground">Carregando seus dados...</div>;
  const fields:Array<[keyof typeof form,string,string]>=[["full_name","Nome / Razão Social","Seu nome ou empresa"],["email","E-mail","email@exemplo.com"],["phone","Telefone / WhatsApp","(19) 99999-9999"],["cpf","CPF","000.000.000-00"],["cnpj","CNPJ","00.000.000/0000-00"],["address_zip","CEP","00000-000"],["address_street","Rua","Rua / Avenida"],["address_number","Número","123"],["address_complement","Complemento","Apto, bloco..."],["address_city","Cidade","Cidade"],["address_state","UF","SP"]];

  return <div className="min-h-screen bg-background"><PageHeader eyebrow="MINHA CONTA" title="MEUS DADOS" subtitle="Salve seus dados uma vez e compre mais rápido nas próximas vezes."/><main className="container max-w-3xl px-4 py-6 pb-24"><Button asChild variant="outline" className="mb-4"><Link to="/meus-pedidos">Ver meus pedidos e entregas</Link></Button><section className="bg-card border border-border rounded-2xl p-4 sm:p-6 space-y-5"><div className="flex gap-3 items-start"><UserRound className="w-5 h-5 text-primary mt-0.5"/><div><h2 className="font-heading font-black text-sm">DADOS PARA COMPRA E ENTREGA</h2><p className="text-xs text-muted-foreground mt-1">Estes dados serão preenchidos automaticamente no checkout. Você poderá alterá-los antes de cada compra.</p></div></div><div className="grid sm:grid-cols-2 gap-4">{fields.map(([key,label,placeholder])=><div key={key} className={key==="full_name"||key==="address_street"?"sm:col-span-2 space-y-1.5":"space-y-1.5"}><Label>{label}</Label><Input value={form[key]} placeholder={placeholder} onChange={e=>{let v=e.target.value;if(key==="cpf")v=maskCpf(v);if(key==="cnpj")v=maskCnpj(v);if(key==="address_zip")v=maskCep(v);if(key==="address_state")v=v.toUpperCase().slice(0,2);set(key,v);}}/></div>)}</div><Button onClick={save} disabled={saving} className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2"/>{saving?"SALVANDO...":"SALVAR MEUS DADOS"}</Button></section></main></div>;
};
export default MinhaConta;
