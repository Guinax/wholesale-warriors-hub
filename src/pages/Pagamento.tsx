import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, QrCode, ShieldCheck, Wallet } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/contexts/CartContext";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { computeDueAt, formatCurrency, generateOrderCode } from "@/lib/orderUtils";
import { logAudit } from "@/lib/audit";
import { createPaymentLink } from "@/lib/payments";
import { lookupCep, shippingCostFor, shippingEtaFor, shippingLoadFor } from "@/lib/shipping";
import { getLiveShippingQuote } from "@/lib/liveShipping";
import { isValidCnpj, isValidCpf } from "@/lib/brDocuments";

type PaymentMethod = "pix" | "cartao";

const FIELD_LABELS: Record<string, string> = {
  name: "Nome / Razão Social",
  email: "E-mail",
  phone: "WhatsApp",
  street: "Rua",
  number: "Número",
  city: "Cidade",
  state: "UF",
  zip: "CEP",
};

const onlyDigits = (v: string) => v.replace(/\D/g, "");

const maskPhone = (v: string) => {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{0,4})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`).trim();
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, (_, a, b, c) => `(${a}) ${b}${c ? "-" + c : ""}`);
};

const maskCep = (v: string) => onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d{0,3})/, (_, a, b) => (b ? `${a}-${b}` : a));

const maskCnpj = (v: string) =>
  onlyDigits(v)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");

const maskCpf = (v: string) =>
  onlyDigits(v)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const Pagamento = () => {
  const { items, totalPrice, clearCart } = useCart() as ReturnType<typeof useCart> & { clearCart?: () => void };
  const { isAdmin } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const forceCentral = Boolean((location.state as { forceCentral?: boolean } | null)?.forceCentral);
  const totalUnits = items.reduce((sum, item) => sum + item.qty, 0);
  const juiceQty = items.reduce(
    (sum, item) => sum + (item.name.startsWith("Suco Natural") ? item.qty : 0),
    0,
  );
  const hasWholesaleBeverage = items.some(
    (item) => !item.name.startsWith("Suco Natural") && item.qty >= 6,
  );
  const isWholesaleOrder = totalUnits >= 50 || juiceQty >= 10 || hasWholesaleBeverage;
  const isLocalRetail = !forceCentral && !isWholesaleOrder;
  const { toast } = useToast();

  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [submitting, setSubmitting] = useState(false);
  const pendingOrder = useRef<{ code: string; snapshot: string } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [editing, setEditing] = useState(false);
  const savedAddress = useRef<typeof customer | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingEta, setShippingEta] = useState("");
  const [checkingCep, setCheckingCep] = useState(false);
  const [validCep, setValidCep] = useState(false);
  const [validatedState, setValidatedState] = useState("");
  const [deliveryCoords, setDeliveryCoords] = useState<{latitude:number;longitude:number}|null>(null);
  const [retryLocation, setRetryLocation] = useState(0);
  const [locatingAddress, setLocatingAddress] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [centralQuote, setCentralQuote] = useState<number | null>(null);
  const [centralQuoteLoading, setCentralQuoteLoading] = useState(false);
  const [localEstimate, setLocalEstimate] = useState<number | null>(null);
  const [localEstimateLoading, setLocalEstimateLoading] = useState(false);
  const [docType, setDocType] = useState<"cpf" | "cnpj">("cpf");
  const [testWithoutShipping, setTestWithoutShipping] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [adultConfirmed, setAdultConfirmed] = useState(false);

  const [customer, setCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    cnpj: "",
    cpf: "",
    street: "",
    number: "",
    complement: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (items.length === 0) {
      toast({ title: "Carrinho vazio", description: "Adicione produtos antes de pagar." });
      navigate("/");
    }
  }, [items.length, navigate, toast]);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setLoadingProfile(false);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("full_name,email,phone,cnpj,cpf,address_street,address_number,address_complement,address_city,address_state,address_zip")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (data) {
        const filled = {
          name: data.full_name ?? "",
          email: data.email ?? user.email ?? "",
          phone: data.phone ?? "",
          cnpj: data.cnpj ?? "",
          cpf: data.cpf || (typeof user.user_metadata?.cpf === "string" ? user.user_metadata.cpf : ""),
          street: data.address_street ?? "",
          number: data.address_number ?? "",
          complement: data.address_complement ?? "",
          city: data.address_city ?? "",
          state: data.address_state ?? "",
          zip: data.address_zip ?? "",
        };
        setCustomer(filled);
        savedAddress.current = filled;
        setDocType(filled.cnpj && !filled.cpf ? "cnpj" : "cpf");
        const complete = filled.name && filled.email && filled.phone && filled.street && filled.number && filled.city && filled.state && filled.zip && (isValidCpf(filled.cpf) || isValidCnpj(filled.cnpj));
        if (!complete) setEditing(true);
      } else {
        setEditing(true);
      }
      setLoadingProfile(false);
    })();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isAdmin) setTestWithoutShipping(false);
  }, [isAdmin]);

  useEffect(() => {
    const digits = onlyDigits(customer.zip);
    if (digits.length !== 8) {
      setValidCep(false);
      setValidatedState("");
      setDeliveryCoords(null);
      setShippingCost(0);
      setShippingEta("");
      return;
    }
    let active = true;
    setCheckingCep(true);
    lookupCep(customer.zip).then(async (info) => {
      if (!active) return;
      if (!info) {
        setValidCep(false);
        setValidatedState("");
        setShippingCost(0);
        setShippingEta("");
        setCheckingCep(false);
        return;
      }
      setValidCep(true);
      setValidatedState(info.state);
      setDeliveryCoords(typeof info.latitude==="number" && typeof info.longitude==="number" ? {latitude:info.latitude,longitude:info.longitude} : null);
      setCustomer((current) => ({
        ...current,
        zip: info.cep,
        street: current.street || info.street,
        city: info.city,
        state: info.state,
      }));

      if (isLocalRetail) {
        setShippingCost(0);
        setShippingEta("");
        setCheckingCep(false);
        return;
      }
      const fallbackCost = shippingCostFor(info.state, totalPrice, totalUnits);
      const fallbackEta = shippingEtaFor(info.state);
      setShippingCost(fallbackCost);
      setShippingEta(fallbackEta);

      const quoteItems = items.flatMap((item) =>
        item.productId ? [{ product_id: item.productId, qty: item.qty }] : []
      );
      if (quoteItems.length === items.length && quoteItems.length > 0) {
        try {
          const live = await getLiveShippingQuote(info.cep, quoteItems);
          if (active && live) {
            setShippingCost(live.cost);
            setShippingEta(live.etaDays === 1
              ? `1 dia útil · ${live.company || live.serviceName}`
              : `${live.etaDays} dias úteis · ${live.company || live.serviceName}`);
          }
        } catch {
          // A tabela regional já foi aplicada acima como fallback.
        }
      }
      if (active) setCheckingCep(false);
    });
    return () => { active = false; };
  }, [customer.zip, totalPrice, items, isLocalRetail]);

  const addressConfirmed = validCep && !checkingCep && customer.state === validatedState &&
    Boolean(customer.street.trim() && customer.number.trim() && customer.city.trim());

  // Central varejo uses the same server route quote later revalidated at payment.
  useEffect(() => {
    if (!forceCentral || isWholesaleOrder || !addressConfirmed) {
      setCentralQuote(null);
      setCentralQuoteLoading(false);
      return;
    }
    let active = true;
    setCentralQuote(null);
    setCentralQuoteLoading(true);
    const timer = window.setTimeout(async () => {
      const address = [customer.street, customer.number, customer.city, customer.state, customer.zip, "Brasil"].join(", ");
      const { data, error } = await supabase.functions.invoke("central-route-quote", { body: { address } });
      if (!active) return;
      const amount = Number(data?.shipping);
      if (!error && data?.available === true && Number.isFinite(amount) && amount > 0) {
        setCentralQuote(amount);
        setShippingCost(amount);
        setShippingEta("Entrega local · Adega Central");
      } else {
        setCentralQuote(null);
        setShippingCost(0);
        setShippingEta("");
      }
      setCentralQuoteLoading(false);
    }, 600);
    return () => { active = false; window.clearTimeout(timer); };
  }, [forceCentral, isWholesaleOrder, addressConfirmed, customer.street, customer.number, customer.city, customer.state, customer.zip]);

  // Persist the complete validated delivery address automatically, including its house number.
  useEffect(() => {
    if (loadingProfile || !addressConfirmed) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { error } = await supabase.from("profiles").update({
        address_street: customer.street.trim(),
        address_number: customer.number.trim(),
        address_complement: customer.complement.trim(),
        address_city: customer.city.trim(),
        address_state: customer.state.trim(),
        address_zip: customer.zip,
      }).eq("user_id", user.id);
      if (!error && !cancelled) savedAddress.current = { ...customer };
      if (error && !cancelled) {
        toast({ title: "Não foi possível salvar o endereço", description: "Confira seus dados e tente novamente.", variant: "destructive" });
      }
    }, 800);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [loadingProfile, addressConfirmed, customer.street, customer.number, customer.complement, customer.city, customer.state, customer.zip, toast]);

  // An address may have no geocoordinates. Check partner connectivity before
  // geocoding so the Central fallback is never blocked by an address lookup.
  useEffect(() => {
    if (!isLocalRetail || !addressConfirmed) return;
    let active = true;
    void supabase.rpc("has_online_delivery_partners" as never).then(({ data, error }) => {
      if (!active || error || data !== false) return;
      toast({ title: "Adega Central assumirá o pedido", description: "Não há parceiros conectados no momento. Confira o frete da Central antes de pagar." });
      navigate("/pagamento", { replace: true, state: { forceCentral: true } });
    });
    return () => { active = false; };
  }, [isLocalRetail, addressConfirmed, navigate, toast]);

  // BrasilAPI and ViaCEP may resolve the street without providing coordinates.
  // Try the full validated address before declaring local delivery unavailable.
  useEffect(() => {
    if (!isLocalRetail || !addressConfirmed || deliveryCoords) {
      setLocatingAddress(false);
      setLocationError(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLocatingAddress(true);
    setLocationError(false);
    const timer = window.setTimeout(async () => {
      try {
        const query = new URLSearchParams({
          street: `${customer.number.trim()} ${customer.street.trim()}`,
          city: customer.city.trim(),
          state: customer.state.trim(),
          country: "Brasil",
          postalcode: onlyDigits(customer.zip),
          format: "jsonv2",
          limit: "1",
          countrycodes: "br",
        });
        const timeout = window.setTimeout(() => controller.abort(), 8000);
        let res: Response;
        try {
          res = await fetch(`https://nominatim.openstreetmap.org/search?${query}`, {
            signal: controller.signal,
            headers: { "Accept-Language": "pt-BR" },
          });
        } finally {
          window.clearTimeout(timeout);
        }
        if (!res.ok) throw new Error("Location lookup unavailable");
        const results = await res.json() as Array<{ lat: string; lon: string }>;
        const lat = Number(results?.[0]?.lat);
        const lng = Number(results?.[0]?.lon);
        if (!results?.length || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
          throw new Error("Full delivery address not found");
        }
        if (active) setDeliveryCoords({ latitude: lat, longitude: lng });
      } catch {
        if (active) setLocationError(true);
      } finally {
        if (active) setLocatingAddress(false);
      }
    }, 900);
    return () => { active = false; window.clearTimeout(timer); controller.abort(); };
  }, [isLocalRetail, addressConfirmed, deliveryCoords, customer.zip, customer.street, customer.number, customer.city, customer.state, retryLocation]);

  useEffect(() => {
    if (!isLocalRetail || !addressConfirmed || !deliveryCoords || items.some(i => !i.productId)) {
      setLocalEstimate(null);
      setLocalEstimateLoading(false);
      return;
    }
    let active = true;
    setLocalEstimate(null);
    setLocalEstimateLoading(true);
    const payload = items.map(i => ({product_id: i.productId, qty: i.qty}));
    void supabase.rpc("preview_partner_delivery" as never, {
      p_lat: deliveryCoords.latitude,
      p_lng: deliveryCoords.longitude,
      p_items: payload,
    } as never).then(({data, error}) => {
      if (!active) return;
      const result = data as {available?:boolean;estimated_shipping?:number}|null;
      if (!error && result?.available === false) {
        // Sem lojas credenciadas, abertas e com conexão recente: a Central assume
        // antes de criar o pedido ou cobrar. Recalcula frete com a regra da Central.
        setLocalEstimate(null);
        setLocalEstimateLoading(false);
        toast({ title: "Adega Central assumirá o pedido", description: "Nenhum parceiro online disponível. O frete será recalculado para atendimento pela Central." });
        navigate("/pagamento", { replace: true, state: { forceCentral: true } });
        return;
      }
      setLocalEstimate(!error && result?.available && result.estimated_shipping != null && Number.isFinite(Number(result.estimated_shipping))
        ? Number(result.estimated_shipping) : null);
      setLocalEstimateLoading(false);
    });
    return () => {active=false};
  }, [isLocalRetail, addressConfirmed, deliveryCoords?.latitude, deliveryCoords?.longitude, items, navigate, toast]);

  const freeShippingTestActive = isAdmin && testWithoutShipping;
  const effectiveShippingCost = freeShippingTestActive ? 0 : forceCentral && !isWholesaleOrder ? (centralQuote ?? 0) : shippingCost;
  const orderTotal = totalPrice + effectiveShippingCost;
  const shippingLoad = shippingLoadFor(items.reduce((sum, item) => sum + item.qty, 0));

  const validateCustomer = () => {
    const required: (keyof typeof customer)[] = ["name", "email", "phone", "street", "number", "city", "state", "zip"];
    for (const k of required) {
      if (!customer[k].trim()) {
        toast({ title: "Dados incompletos", description: `Preencha: ${FIELD_LABELS[k] ?? k}`, variant: "destructive" });
        return false;
      }
    }
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return false;
    }
    if (onlyDigits(customer.phone).length < 10) {
      toast({ title: "WhatsApp inválido", description: "Informe DDD + número.", variant: "destructive" });
      return false;
    }
    if (onlyDigits(customer.zip).length !== 8 || checkingCep || !validCep || customer.state !== validatedState) {
      toast({ title: "CEP inválido", description: checkingCep ? "Aguarde a validação do CEP." : "Informe um CEP válido para calcular o frete.", variant: "destructive" });
      return false;
    }
    if (docType === "cnpj") {
      if (!isValidCnpj(customer.cnpj)) {
        toast({ title: "CNPJ inválido", description: "Confira os dígitos do CNPJ.", variant: "destructive" });
        return false;
      }
    } else if (!isValidCpf(customer.cpf)) {
      toast({ title: "CPF inválido", description: "Confira os dígitos do CPF.", variant: "destructive" });
      return false;
    }
    return true;
  };

  // Save validated checkout documents independently of placing or paying for an order.
  useEffect(() => {
    if (loadingProfile) return;
    const document = docType === "cpf" ? customer.cpf : customer.cnpj;
    const isValid = docType === "cpf" ? isValidCpf(document) : isValidCnpj(document);
    if (!isValid) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const field = docType === "cpf" ? "cpf" : "cnpj";
      const { data, error } = await supabase.from("profiles").update({ [field]: document }).eq("user_id", user.id).select(field).maybeSingle();
      if (cancelled) return;
      if (error || !data || onlyDigits(String(data[field] ?? "")) !== onlyDigits(document)) {
        // If the profile row cannot be updated, retain the document in the
        // authenticated account metadata for prefill on the next checkout.
        // Metadata is never used for authorization.
        const { error: fallbackError } = await supabase.auth.updateUser({ data: { [field]: onlyDigits(document) } });
        if (fallbackError) {
          toast({ title: "Documento não foi salvo", description: "Não foi possível guardar o CPF/CNPJ. Confira sua conexão e tente novamente.", variant: "destructive" });
          return;
        }
      }
      savedAddress.current = { ...(savedAddress.current ?? customer), [field]: document };
    }, 800);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [loadingProfile, docType, customer.cpf, customer.cnpj, toast]);

  const handleConfirm = async () => {
    if (submitting) return;
    if (!validateCustomer()) return;
    if (!acceptedTerms || !adultConfirmed) {
      toast({ title: "Confirmações necessárias", description: "Aceite os termos e confirme que você tem 18 anos ou mais para continuar.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      setSubmitting(false);
      toast({ title: "Entre na sua conta para continuar", variant: "destructive" });
      navigate(`/auth?next=${encodeURIComponent("/pagamento")}`);
      return;
    }

    if (testWithoutShipping) {
      const { data: adminRole, error: adminError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (adminError || !adminRole) {
        setTestWithoutShipping(false);
        setSubmitting(false);
        toast({ title: "Teste sem frete não autorizado", description: "Esta opção é exclusiva para administrador.", variant: "destructive" });
        return;
      }
    }

    const productIds = [...new Set(items.map((item) => item.productId).filter((id): id is string => Boolean(id)))];
    const legacyNames = [...new Set(items.filter((item) => !item.productId).map((item) => item.name))];
    const [byId, byLegacyName] = await Promise.all([
      productIds.length
        ? supabase.from("products").select("id,name,category,min_qty,unit_price,wholesale_price,stock").eq("active", true).in("id", productIds)
        : Promise.resolve({ data: [], error: null }),
      legacyNames.length
        ? supabase.from("products").select("id,name,category,min_qty,unit_price,wholesale_price,stock").eq("active", true).in("name", legacyNames)
        : Promise.resolve({ data: [], error: null }),
    ]);
    if (byId.error || byLegacyName.error) {
      setSubmitting(false);
      toast({ title: "Não foi possível consultar o catálogo", description: "Tente novamente.", variant: "destructive" });
      return;
    }
    const catalog = [...(byId.data ?? []), ...(byLegacyName.data ?? [])];
    const invalidItem = items.find(item => {
      const product = catalog?.find(product => item.productId ? product.id === item.productId : product.name === item.name);
      const wholesaleApplies = product
        ? product.category === "bebidas_naturais"
          ? juiceQty >= 10
          : item.qty >= (Number.isSafeInteger(Number(product.min_qty)) && Number(product.min_qty) > 1 ? Number(product.min_qty) : 6)
        : false;
      const expectedPrice = product ? (wholesaleApplies ? product.wholesale_price : product.unit_price) : 0;
      return !product || !Number.isInteger(item.qty) || item.qty < 1 || item.qty > product.stock ||
        Math.round(item.priceNum * 100) !== Math.round(expectedPrice * 100);
    });
    if (!items.length || invalidItem) {
      setSubmitting(false);
      toast({ title: "Revise seu carrinho", description: invalidItem
        ? `${invalidItem.name}: preço, quantidade ou estoque mudou. Remova o item e adicione-o novamente pelo catálogo.`
        : "Seu carrinho está vazio.", variant: "destructive" });
      return;
    }

    if (forceCentral && !isWholesaleOrder && !freeShippingTestActive && (centralQuoteLoading || centralQuote == null)) {
      setSubmitting(false);
      toast({ title: "Frete por rota indisponível", description: "Confira seu endereço e aguarde o cálculo antes de pagar.", variant: "destructive" });
      return;
    }

    // Prefer a local partner when CEP geocoding is available. Any routing failure
    // intentionally falls through to the existing central checkout.
    if (isLocalRetail && !freeShippingTestActive) {
      if (!deliveryCoords) {
        setSubmitting(false);
        toast({ title: "Localização necessária", description: "Não foi possível localizar o endereço pelo CEP. Confira o CEP para solicitar entrega local.", variant: "destructive" });
        return;
      }
      const partnerItems = items.map((i) => ({ product_id: i.productId, name: i.name, qty: i.qty })).filter((i) => i.product_id);
      if (partnerItems.length === items.length) {
        const { data: routed, error: routeError } = await supabase.rpc("partner_command" as never, {
          p_action: "create_request",
          p_payload: {
            terms: acceptedTerms,
            adult: adultConfirmed,
            lat: deliveryCoords.latitude,
            lng: deliveryCoords.longitude,
            customer: { name: customer.name, phone: customer.phone, street: customer.street, number: customer.number, complement: customer.complement, city: customer.city, state: customer.state, zip: onlyDigits(customer.zip) },
            items: partnerItems,
          },
        } as never);
        const requestId = (routed as {request_id?:string}|null)?.request_id;
        if (requestId) {
          const { data: prepared, error: prepareError } = await supabase.rpc("partner_prepare_payment" as never, { p_request_id: requestId } as never);
          const preparedOrder = prepared as { order_code?: string; shipping?: number; total?: number } | null;
          if (prepareError || !preparedOrder?.order_code) {
            // A falta de parceiros é uma condição operacional normal: transfira o
            // checkout para a Adega Central e recalcule o frete antes de cobrar.
            // Outros erros (estoque, autenticação, indisponibilidade do servidor)
            // não devem ser mascarados como ausência de lojistas.
            if (prepareError && /nenhuma loja parceira disponível para este pedido/i.test(prepareError.message)) {
              await supabase.rpc("partner_command" as never, {
                p_action: "cancel",
                p_payload: { request_id: requestId },
              } as never);
              setSubmitting(false);
              toast({ title: "Adega Central assumirá o pedido", description: "Nenhum lojista disponível. O frete será recalculado para atendimento pela Central." });
              navigate("/pagamento", { replace: true, state: { forceCentral: true } });
              return;
            }
            setSubmitting(false);
            toast({ title: "Não foi possível preparar o pagamento", description: prepareError?.message || "Tente novamente.", variant: "destructive" });
            return;
          }
          try {
            const checkoutUrl = await createPaymentLink(preparedOrder.order_code, `${window.location.origin}/recibo/${preparedOrder.order_code}`);
            toast({ title: "Frete calculado", description: `Entrega ${formatCurrency(Number(preparedOrder.shipping || 0))}. Finalize o pagamento para liberar o pedido à loja.` });
            window.location.href = checkoutUrl;
            return;
          } catch (error) {
            setSubmitting(false);
            toast({ title: "Pagamento indisponível", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" });
            return;
          }
        }
        // Fall back to the central warehouse only for an explicit no-store result.
        // Do not mask authentication, inventory or infrastructure errors.
        const noPartnerAvailable = Boolean(routeError && /nenhum parceiro aberto com todo o estoque nesta região|nenhuma loja parceira (disponível|com estoque|aberta)|nenhuma loja disponível/i.test(routeError.message));
        if (!noPartnerAvailable) {
          setSubmitting(false);
          toast({ title: "Erro ao localizar loja", description: routeError.message, variant: "destructive" });
          return;
        }
        setSubmitting(false);
        toast({ title: "Adega Central assumirá o pedido", description: "Nenhum lojista disponível. Confira o frete da Central antes de pagar." });
        navigate("/pagamento", { replace: true, state: { forceCentral: true } });
        return;
      }
      setSubmitting(false);
      toast({ title: "Produto indisponível para entrega local", variant: "destructive" });
      return;
    }

    const snapshot = JSON.stringify({ customer, docType, method, items, orderTotal, freeShippingTestActive });
    const reusableOrder = pendingOrder.current?.snapshot === snapshot ? pendingOrder.current : null;
    const orderCode = reusableOrder?.code ?? generateOrderCode();
    const dueAt = computeDueAt();

    if (!reusableOrder) {
      const { error } = await supabase.from("orders").insert({
        user_id: user.id,
        order_code: orderCode,
        payment_method: method,
        payment_status: "pending",
        due_at: dueAt.toISOString(),
        delivery_status: "aguardando_pagamento",
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        customer_cnpj: docType === "cnpj" ? customer.cnpj : null,
        customer_cpf: docType === "cpf" ? customer.cpf : null,
        address_street: customer.street,
        address_number: customer.number,
        address_complement: customer.complement || null,
        address_city: customer.city,
        address_state: customer.state,
        address_zip: customer.zip,
        items: items.map((i) => ({
          product_id: i.productId ?? null,
          name: i.name,
          qty: i.qty,
          unit_price: i.priceNum,
          subtotal: i.priceNum * i.qty,
        })),
        total_amount: orderTotal,
        delivery_quote: forceCentral && !isWholesaleOrder && !freeShippingTestActive ? centralQuote : null,
      });

      if (error) {
        setSubmitting(false);
        toast({ title: "Erro ao processar pedido", description: error.message, variant: "destructive" });
        return;
      }
      pendingOrder.current = { code: orderCode, snapshot };

      await logAudit("order_created", {
        entity: "orders",
        entity_id: orderCode,
        details: { subtotal: totalPrice, shipping: effectiveShippingCost, total: orderTotal, method, items: items.length, free_shipping_test: freeShippingTestActive },
      });

      try {
        await supabase
          .from("profiles")
          .update({
            full_name: customer.name,
            phone: customer.phone,
            ...(docType === "cnpj" ? { cnpj: customer.cnpj || null } : { cpf: customer.cpf || null }),

          })
          .eq("user_id", user.id);
      } catch {
        // falha ao salvar perfil não deve bloquear o pedido
      }
    }

    try {
      const checkoutUrl = await createPaymentLink(orderCode, `${window.location.origin}/recibo/${orderCode}`);
      window.location.href = checkoutUrl;
    } catch (error) {
      toast({
        title: "Pagamento indisponível",
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        eyebrow="CHECKOUT SEGURO"
        title="FINALIZAR PAGAMENTO"
        subtitle="Escolha entre Pix ou cartão de crédito. Compra mínima: 1 unidade."
      />

      <main className="container px-3 sm:px-4 py-4 sm:py-6 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 sm:gap-6 pb-24">
        <div className="lg:hidden">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-xs font-heading font-bold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> VOLTAR ÀS COMPRAS
          </button>
        </div>

        <section className="space-y-4 sm:space-y-6">
          <div className="bg-card border border-border rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-heading font-black text-sm tracking-wider text-foreground">DADOS DE ENTREGA</h2>
              {!loadingProfile && (
                <button onClick={() => {
                  if (editing && savedAddress.current) setCustomer((current) => ({ ...savedAddress.current!, cpf: current.cpf, cnpj: current.cnpj }));
                  setEditing((e) => !e);
                }} className="text-[11px] font-heading font-bold tracking-wider text-primary hover:underline">
                  {editing ? "USAR ENDEREÇO CADASTRADO" : "ALTERAR ENDEREÇO DE ENTREGA"}
                </button>
              )}
            </div>

            {loadingProfile ? (
              <p className="text-xs text-muted-foreground">Carregando seus dados cadastrados...</p>
            ) : !editing ? (
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="text-foreground font-semibold">{customer.name}</p>
                {docType === "cnpj" ? customer.cnpj && <p>CNPJ: {customer.cnpj}</p> : customer.cpf && <p>CPF: {customer.cpf}</p>}
                <p>{customer.email} · {customer.phone}</p>
                <p>{customer.street}, {customer.number}{customer.complement ? ` — ${customer.complement}` : ""}</p>
                <p>{customer.city}/{customer.state} · CEP {customer.zip}</p>
                <p className="text-[10px] pt-1">Confira o endereço acima. Se estiver correto, aceite as condições abaixo e finalize o pedido.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label className="text-[10px] font-heading font-bold tracking-wider text-muted-foreground">TIPO DE DOCUMENTO</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["cpf", "cnpj"] as const).map((t) => (
                      <button key={t} type="button" onClick={() => setDocType(t)} className={`py-2 rounded-md text-[11px] font-heading font-bold tracking-wider border transition-colors ${docType === t ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-muted-foreground border-border"}`}>
                        {t === "cpf" ? "CPF (PESSOA FÍSICA)" : "CNPJ (EMPRESA)"}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Nome / Razão Social" value={customer.name} onChange={(v) => setCustomer({ ...customer, name: v })} />
                {docType === "cnpj" ? (
                  <Field label="CNPJ" value={customer.cnpj} inputMode="numeric" placeholder="00.000.000/0000-00" onChange={(v) => setCustomer({ ...customer, cnpj: maskCnpj(v) })} />
                ) : (
                  <Field label="CPF" value={customer.cpf} inputMode="numeric" placeholder="000.000.000-00" onChange={(v) => setCustomer({ ...customer, cpf: maskCpf(v) })} />
                )}
                <Field label="E-mail" type="email" value={customer.email} onChange={(v) => setCustomer({ ...customer, email: v })} />
                <Field label="WhatsApp" value={customer.phone} inputMode="tel" placeholder="(00) 00000-0000" onChange={(v) => setCustomer({ ...customer, phone: maskPhone(v) })} />
                <div className="sm:col-span-2">
                  <Field label="CEP DE ENTREGA" value={customer.zip} inputMode="numeric" placeholder="00000-000" onChange={(v) => {
                    const zip = maskCep(v);
                    setValidCep(false);
                    setValidatedState("");
                    setShippingCost(0);
                    setShippingEta("");
                    setCustomer((current) => onlyDigits(current.zip) === onlyDigits(zip)
                      ? { ...current, zip }
                      : { ...current, zip, street: "", city: "", state: "", number: "", complement: "" });
                  }} />
                  {checkingCep && <p className="mt-2 text-[11px] text-muted-foreground">Buscando endereço do CEP...</p>}
                </div>

                {validCep && customer.street && customer.city && customer.state && (
                  <div className="sm:col-span-2 rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
                    <div>
                      <p className="text-[10px] font-heading font-bold tracking-wider text-primary">ENDEREÇO ENCONTRADO</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">{customer.street}</p>
                      <p className="text-xs text-muted-foreground">{customer.city}/{customer.state} · CEP {customer.zip}</p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field label="Número *" value={customer.number} inputMode="numeric" placeholder="Ex.: 123" onChange={(v) => setCustomer({ ...customer, number: v })} />
                      <Field label="Complemento" value={customer.complement} placeholder="Apto, bloco, referência..." onChange={(v) => setCustomer({ ...customer, complement: v })} />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Informe o número. O endereço será salvo automaticamente.</p>
                  </div>
                )}

                {validCep && !customer.street && (
                  <>
                    <Field label="Rua" value={customer.street} placeholder="Informe a rua" onChange={(v) => setCustomer({ ...customer, street: v })} />
                    <Field label="Número *" value={customer.number} inputMode="numeric" placeholder="Ex.: 123" onChange={(v) => setCustomer({ ...customer, number: v })} />
                    <Field label="Complemento" value={customer.complement} placeholder="Apto, bloco, referência..." onChange={(v) => setCustomer({ ...customer, complement: v })} />
                    <Field label="Cidade" value={customer.city} onChange={(v) => setCustomer({ ...customer, city: v })} />
                    <Field label="UF" value={customer.state} onChange={(v) => setCustomer({ ...customer, state: v.toUpperCase().slice(0, 2) })} />
                  </>
                )}
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
            <h2 className="font-heading font-black text-sm tracking-wider text-foreground">FORMA DE PAGAMENTO</h2>
            <Tabs value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
              <TabsList className="w-full grid grid-cols-2 bg-secondary">
                <TabsTrigger value="pix" className="gap-1.5"><QrCode className="w-3.5 h-3.5" /> PIX</TabsTrigger>
                <TabsTrigger value="cartao" className="gap-1.5"><CreditCard className="w-3.5 h-3.5" /> CARTÃO</TabsTrigger>
              </TabsList>
              <TabsContent value="pix" className="mt-4 space-y-4">
                <p className="text-xs text-muted-foreground">O Pix será apresentado no checkout seguro da InfinitePay após continuar.</p>
              </TabsContent>
              <TabsContent value="cartao" className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-primary shrink-0" /> Os dados do cartão são informados somente no checkout seguro da InfinitePay.</p>
              </TabsContent>
            </Tabs>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
            <h3 className="font-heading font-black text-sm tracking-wider text-foreground flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> RESUMO DO LOTE</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {items.map((i) => (
                <div key={i.name} className="flex justify-between text-xs">
                  <span className="text-muted-foreground truncate pr-2">{i.qty}× {i.name}</span>
                  <span className="text-foreground font-semibold whitespace-nowrap">{formatCurrency(i.priceNum * i.qty)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Produtos</span><span>{formatCurrency(totalPrice)}</span></div>
              <div className="flex justify-between text-xs"><span className="text-muted-foreground">Frete</span><span>{isLocalRetail && !freeShippingTestActive ? (localEstimate != null ? formatCurrency(localEstimate) : !addressConfirmed ? "Verificando endereço" : localEstimateLoading || locatingAddress ? "Calculando..." : "Indisponível") : freeShippingTestActive ? "Grátis (teste admin)" : forceCentral && !isWholesaleOrder ? (centralQuoteLoading ? "Calculando rota..." : centralQuote != null ? formatCurrency(centralQuote) : "Rota indisponível") : checkingCep ? "Calculando..." : shippingCost === 0 && shippingEta ? "Grátis" : formatCurrency(shippingCost)}</span></div>
              {isLocalRetail && !freeShippingTestActive && <p className="text-[10px] text-muted-foreground">O frete é calculado pela distância da loja parceira até o endereço. O valor definitivo e o total serão confirmados antes do pagamento.</p>}
              {isLocalRetail && addressConfirmed && locationError && !deliveryCoords && <div className="text-xs text-muted-foreground space-y-1"><p>Não foi possível localizar as coordenadas do endereço. Confira rua, número e CEP e tente novamente.</p><button type="button" className="underline font-semibold" onClick={() => setRetryLocation(v => v + 1)}>Tentar calcular frete novamente</button></div>}

              {shippingEta && <p className="text-[10px] text-muted-foreground">Prazo estimado: {shippingEta}</p>}
              {shippingEta && <p className="text-[10px] text-muted-foreground">{shippingLoad.units} unidade{shippingLoad.units > 1 ? "s" : ""} · peso estimado {shippingLoad.estimatedWeightKg.toFixed(1).replace(".", ",")} kg</p>}
              {isAdmin && (
                <label className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-secondary/50 p-3 cursor-pointer">
                  <input type="checkbox" checked={testWithoutShipping} onChange={(e) => setTestWithoutShipping(e.target.checked)} className="mt-0.5 h-4 w-4 accent-current" />
                  <span className="text-[11px] text-foreground"><strong>Teste sem frete</strong><br /><span className="text-muted-foreground">Somente administrador. Zera o frete desta cobrança para teste.</span></span>
                </label>
              )}
              <div className="border-t border-border pt-3 flex justify-between items-center">
                <span className="font-heading font-bold text-xs tracking-wider text-muted-foreground">TOTAL</span>
                <span className="font-heading font-black text-xl text-foreground">{isLocalRetail && !freeShippingTestActive ? (addressConfirmed && localEstimate != null ? formatCurrency(totalPrice + localEstimate) : "Aguardando frete") : formatCurrency(orderTotal)}</span>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-border bg-card p-4">
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} className="mt-0.5 h-4 w-4 accent-current" />
              <span className="text-[11px] text-foreground">Li e aceito os termos e condições da compra e entrega.</span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={adultConfirmed} onChange={(e) => setAdultConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-current" />
              <span className="text-[11px] text-foreground">Confirmo que tenho 18 anos ou mais e estou ciente de que poderá ser exigido documento oficial com foto no recebimento de bebidas alcoólicas.</span>
            </label>
          </div>
          <button disabled={loadingProfile || submitting || !acceptedTerms || !adultConfirmed} onClick={handleConfirm} className="w-full bg-primary text-primary-foreground font-heading font-black text-sm tracking-wider py-4 rounded-lg hover:opacity-90 transition-opacity glow-neon disabled:opacity-40 disabled:cursor-not-allowed">
            {submitting ? (isLocalRetail && !freeShippingTestActive ? "BUSCANDO LOJA..." : "ABRINDO CHECKOUT...") : "FINALIZAR PAGAMENTO"}
          </button>
        </aside>
      </main>
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", placeholder, inputMode }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputMode?: "text" | "numeric" | "tel" | "email" | "decimal";
}) => (
  <div className="space-y-1.5">
    <Label className="text-[10px] font-heading font-bold tracking-wider text-muted-foreground">{label}</Label>
    <Input type={type} value={value} inputMode={inputMode} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="bg-secondary border-border text-foreground" />
  </div>
);

export default Pagamento;
