# Situação operacional — 30/09/2026

## Validado nesta revisão

- Tipos atualizados a partir do banco de produção e verificação TypeScript obrigatória no CI.
- Testes, lint e compilação executados localmente; validar também os workflows do commit publicado.
- Realtime de `orders` e `stock_movements` habilitado sem ampliar RLS.
- Rastreios não são inventados: pedidos novos aguardam envio; administração informa a referência real na expedição.
- Inicialização do rastreio verificada no banco em transação revertida, sem manter pedido de teste.
- Área Meus pedidos autenticada com filtro por proprietário, recibos e atualização por eventos.
- Conferência operacional em Admin → Conferência, com atalhos para corrigir cadastros.
- Consulta de CEP tem timeout e mantém fallback regional previamente adotado.

## Pendências externas à implementação

1. **Publicação:** o domínio público ainda redirecionava a vitrine para login após o primeiro commit desta revisão. A branch Main permite acesso público. Não foi editado o Lovable. Após republicar pelo fluxo de hospedagem existente, comparar `/build-info.json` com o SHA do GitHub e testar `/` sem sessão.
2. **Catálogo:** 22 produtos ativos na consulta inicial; 21 sem foto, apenas 1 com saldo. Confirmar fotos e quantidade física; não inventar estoque.
3. **Transportadora:** nenhum produto tinha todas as medidas e a tabela privada de autorização do Melhor Envio estava vazia. Admin → Logística permite conectar a conta quando as credenciais estiverem configuradas. Medir embalagens e preencher os dados reais. O cálculo regional permanece disponível.
4. **Parceiros:** nenhuma loja nem estoque de parceiro na consulta inicial. Cadastrar lojas, aprovar termos, configurar área atendida, entregador e estoque. Repasse bancário continua manual; o painel registra aprovação e comprovante.
5. **Aceite operacional:** confirmar e-mail, realizar compra autorizada, conferir confirmação InfinitePay, baixa de estoque, entrega e atualização em dois dispositivos. Testes automatizados não substituem esse aceite. Não houve cobrança real nesta execução.

## Sequência de validação na publicação

- Visitante abre a home e o catálogo sem login; conta, recibos e administração exigem autenticação.
- Cliente cadastra-se, confirma o e-mail e retorna ao destino correto.
- Cliente encontra somente seus pedidos, inclusive após entrar novamente.
- Checkout exibe o frete regional ou cotação autorizada, sem gerar instruções de pagamento alternativas à InfinitePay.
- Pagamento confirmado libera separação e desconta estoque uma única vez.
- Administração cadastra rastreio real; cliente vê a alteração no recibo e no histórico.
- Compra expirada/cancelada não é despachada; pagamento tardio exige reconciliação.
- Validar fluxo de parceiro antes de ativar entregas locais em produção.
