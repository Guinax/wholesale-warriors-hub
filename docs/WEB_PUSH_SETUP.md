# Notificações em segundo plano — implantação controlada

**Status:** código preparado na branch de testes; **NÃO está ativado em produção**.

## Componentes

- PWA Workbox importa `/push-handler.js` no service worker.
- Cada motoqueiro ou dono de loja aprovado autoriza explicitamente o aparelho com o botão no painel.
- `push-subscriptions` registra a assinatura somente após conferir o JWT e a função aprovada do usuário.
- Migrações criam `web_push_subscriptions` (segredos de dispositivo protegidos por RLS) e `web_push_outbox` (fila privada).
- Triggers enfileiram ofertas de parceiro e corridas em busca de entregador.
- `push-dispatch` usa credenciais **exclusivas do servidor**, revalida disponibilidade e envia Web Push.

## Etapas antes da ativação

1. Revisar migrações, índices e políticas de acesso em um projeto de **staging** Supabase.
2. Criar um par VAPID válido com uma ferramenta de geração confiável. Definir
   `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (exemplo: `mailto:suporte@seu-dominio`)
   e um `PUSH_DISPATCH_SECRET` forte como **segredos da Edge Function**, nunca no frontend.
3. Disponibilizar **apenas** `VITE_WEB_PUSH_PUBLIC_KEY` no build do aplicativo, igual a `VAPID_PUBLIC_KEY`.
4. Implantar as duas Edge Functions e as migrações em staging; confirmar que
   `push-subscriptions` exige autenticação e `push-dispatch` só aceita o segredo de servidor.
5. Configurar chamada **agendada do lado servidor** para `push-dispatch`, com HTTPS POST e o header
   `x-push-dispatch-secret`. Nunca colocar esse segredo em cron público ou SQL versionado.
   Sem o agendamento, a fila é criada mas os push **não são enviados automaticamente**.
6. Testar casos: motoboy online/offline, loja aberta/fechada, pedido expirado, permissão negada,
   token inválido, celular bloqueado, PWA instalada, atualização e exclusão de assinatura.
7. Som e prioridade são controlados pelo SO/navegador. Não prometer som personalizado,
   entrega instantânea ou funcionamento em todos os aparelhos (economia de bateria/Do Not Disturb).
8. Validar fluxos existentes (login, checkout InfinitePay, aceite de pedidos e entregas)
   antes de solicitar aprovação explícita para merge e publicação.

## Limitações conhecidas antes de produção

- O dispatcher atualmente não usa claim transacional de mensagens; ao ampliar para múltiplas instâncias,
  adicionar reserva atômica/lease para evitar envio simultâneo duplicado.
- Ofertas cujo `available_at` está no futuro não são enfileiradas só pela passagem do tempo,
  a menos que ocorra novo evento de atualização. Incluir varredura periódica por ofertas elegíveis.
- A versão atual da fila sinaliza a primeira geração da oportunidade (idempotência por destinatário);
  para reoferta após expiração, criar identificador de geração.
- Falta teste ponta-a-ponta no Android e no ambiente Supabase da aplicação.
