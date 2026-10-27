import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.png";

const sections = [
  {
    title: "1. Participantes e finalidade",
    text: "A Mansão Maromba conecta clientes, parceiros comerciais, entregadores e administradores em uma única operação de vendas, estoque, pagamentos, repasses e entregas."
  },
  {
    title: "2. Catálogo oficial e igualdade entre parceiros",
    text: "Os parceiros comercializam somente produtos cadastrados e autorizados pela Mansão Maromba. Não podem cadastrar produtos próprios nem alterar os preços definidos pela plataforma. Preços e margens seguem o padrão vigente da rede, preservando igualdade comercial entre parceiros submetidos às mesmas condições."
  },
  {
    title: "3. Estoque do parceiro",
    text: "O parceiro informa somente a quantidade física disponível dos produtos oficiais liberados pela plataforma. É responsabilidade do parceiro manter o estoque informado compatível com o estoque real."
  },
  {
    title: "4. Vendas, fechamento e repasses",
    text: "As vendas confirmadas ficam registradas no painel financeiro da loja. Ao final de cada dia é realizado o fechamento. O valor devido ao parceiro é programado para repasse no próximo dia útil para a conta cadastrada, observados cancelamentos, estornos, chargebacks, suspeitas de fraude e ajustes operacionais."
  },
  {
    title: "5. Entregas",
    text: "As entregas podem ser atendidas por entregadores da rede, frota própria do parceiro ou outra modalidade autorizada. O direcionamento considera disponibilidade, localização, rota e regras operacionais. O cadastro de entregador não garante quantidade mínima de corridas ou renda."
  },
  {
    title: "6. Localização",
    text: "Quando necessária para a operação e autorizada no dispositivo, a localização do entregador pode ser utilizada para encontrar oportunidades próximas, calcular rotas, acompanhar entregas e aumentar a segurança e a rastreabilidade."
  },
  {
    title: "7. Dados pessoais e privacidade",
    text: "A plataforma pode tratar dados de identificação, contato, conta, estabelecimento, pedidos, entregas, localização, pagamentos, repasses e segurança, sempre para finalidades ligadas à operação, prevenção de fraude, atendimento e cumprimento de obrigações legais."
  },
  {
    title: "8. Compartilhamento necessário",
    text: "Dados podem ser compartilhados somente na medida necessária entre cliente, parceiro, entregador e prestadores de tecnologia, pagamento, comunicação, mapas ou logística que participem da operação."
  },
  {
    title: "9. Segurança e responsabilidade",
    text: "Usuários devem fornecer informações verdadeiras, proteger suas credenciais e respeitar as regras da plataforma. Fraude, manipulação de vendas, cadastro falso, venda de produtos não autorizados ou uso indevido podem resultar em suspensão."
  },
  {
    title: "10. Direitos de privacidade",
    text: "O titular pode exercer os direitos previstos na LGPD, incluindo acesso, correção e demais solicitações legalmente aplicáveis. Alguns registros podem ser mantidos quando houver obrigação legal, prevenção de fraude ou necessidade de exercício de direitos."
  },
  {
    title: "11. Atualizações e novo aceite",
    text: "Mudanças relevantes neste Termo podem exigir novo aceite. A versão vigente permanecerá disponível nesta página e, quando aplicável, a operação poderá ficar bloqueada até a confirmação da nova versão."
  }
];

export default function Termos() {
  const navigate = useNavigate();
  return (
    <main className="min-h-screen bg-[#090909] text-zinc-100">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#090909]/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5" aria-label="Voltar">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <img src={logo} alt="Mansão Maromba" className="h-9 w-9 object-contain" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-300">Mansão Maromba</p>
            <h1 className="text-sm font-bold sm:text-base">Termo Único de Adesão, Operação, Uso e Privacidade</h1>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
        <section className="rounded-3xl border border-yellow-400/20 bg-gradient-to-br from-yellow-400/10 via-white/[0.03] to-transparent p-5 sm:p-8">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-yellow-300" />
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-yellow-300">Versão vigente · 12/10/2026</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Um único termo para parceiros e entregadores</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Ao marcar “Li e aceito” no fluxo de cadastro ou renovação, o usuário confirma que leu, compreendeu e concorda com as regras abaixo.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6 space-y-4">
          {sections.map((section) => (
            <section key={section.title} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
              <h3 className="font-black text-yellow-200">{section.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{section.text}</p>
            </section>
          ))}
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-5 text-sm leading-6 text-zinc-300">
          <h3 className="font-black text-white">Declaração de aceite</h3>
          <p className="mt-2">Declaro que li, compreendi e concordo integralmente com o Termo Único de Adesão, Operação, Uso da Plataforma e Privacidade da Mansão Maromba.</p>
          <p className="mt-4 text-xs text-zinc-500">Responsável legal, razão social, CNPJ e canal de privacidade deverão permanecer atualizados nos cadastros oficiais da operação.</p>
        </section>
      </article>
    </main>
  );
}
