# Pix manual e Checkout Pro via Orders — relatório final

Workspace: `C:\Users\samsung\OneDrive\Desktop\ts-agency-app`.

## 1. Implementação anterior e adaptação

O checkout por fatura existente criava Preferences e consultava Payments/merchant_orders. Foram reutilizadas as três Functions, as reservas transacionais, a política de autorização, o controle de invoiceVersion e a rotina compartilhada de settlement. As novas tentativas usam Orders. A leitura compatível de registros antigos do codebase default foi mantida; não houve migração nem utilização do codebase payments/.

## 2. Arquivos desta missão

Produção:
- functions/src/checkout-payment-processing.ts
- functions/src/checkout-payment-provider.ts
- functions/src/checkout-webhook-auth.ts
- functions/src/invoice-checkout-domain.ts
- functions/src/invoice-checkout.ts
- functions/src/invoice-management.ts
- functions/src/mercado-pago-checkout.ts
- src/components/Admin/AgencySettings.tsx
- src/components/finance/InvoicePaymentOptions.tsx
- src/services/agency-pix-qr.service.ts (novo)
- storage.rules

Testes:
- functions/src/test/invoice-checkout.test.ts
- functions/src/test/checkout-orders.test.ts (novo)
- src/test/agency-payment-settings.test.tsx
- src/test/invoice-checkout-button.test.tsx
- src/test/invoice-payment-options.test.tsx
- test/rules/checkout-orders.test.mjs (novo)
- test/rules/checkout-settlement.test.mjs
- test/rules/invoice-checkout.test.mjs
- test/rules/invoice-management.test.mjs
- test/rules/payments.rules.test.mjs

Documentação: este relatório. cors.json é preexistente e não pertence à missão.

## 3–4. QR Pix e preservação em falhas

Configurações > Pagamentos aceita PNG, JPG/JPEG e WEBP não vazios, até 5 MiB (5 × 1024 × 1024 bytes). Mostra QR atual, seleção e preview. Ao salvar, apresenta loading e impede submissões duplicadas. Reutiliza o repository de Storage; grava um arquivo novo em `agency/payments/pix-qr/{UUID}.{ext}` e só então salva `agency_config/default.pixQrCodeUrl` pelo serviço existente. A configuração global é lida pelas cobranças.

Nenhum QR anterior é apagado. Falhas de upload não persistem uma URL nova. Falhas ambíguas de persistência não provocam exclusão compensatória: a mensagem pede conferir a configuração antes de repetir. Objetos antigos ou uploads sem confirmação podem permanecer no Storage; sua limpeza não foi automatizada.

Pix continua manual, global, sem valor fixo gerado e sem interpretação de payload. Chave, QR e Copiar Pix permanecem disponíveis. Cliente informa pagamento; somente Admin confirma. Uma chave específica antiga de fatura não recebe QR de uma chave global diferente.

## 5. Criação da order

createInvoiceCheckout autentica o usuário e autoriza Admin ativo ou Cliente dono da fatura com acesso habilitado. Equipe não pode iniciar checkout. Carrega preço e dados da fatura no Firestore e ignora propriedades financeiras do navegador.

O adapter envia POST `/v1/orders`, com Authorization exclusivamente backend e X-Idempotency-Key. Payload: type=online, processing_mode=manual, total_amount decimal em string, um item com preço/total consistentes, referência interna, descrição limitada e expiration_time=PT1H. Configura as URLs de retorno da tela financeira e exclui Pix do checkout em `config.payment_method.not_allowed_ids`, mantendo Pix manual separado.

Orders deriva a moeda da conta vendedora; não foi inventado um campo de entrada incompatível. A fatura local deve ser BRL, a criação rejeita resposta não BRL e o settlement confere BRL novamente. Valida ID da order, referência e URL HTTPS do domínio permitido antes de retornar a URL.

## 6. Idempotência

UUID de 36 caracteres por tentativa, persistido antes da chamada externa; abaixo do limite conservador de 64 adotado pelo adapter. Reserva/lock por fatura impede chamadas concorrentes de criarem tentativas independentes. Um retry HTTP limitado usa exatamente o mesmo payload e chave. POST nunca ocorre dentro de callback transacional do Firestore.

Tentativa pronta pode reutilizar a URL. Rejeição definitiva sem resultado anterior incerto permite nova tentativa intencional com nova chave. Timeout, resposta perdida, falha ao persistir ou resultado incerto conservam a reserva e bloqueiam nova cobrança. Um erro definitivo recebido depois de timeout não transforma o resultado em seguro para nova tentativa. Expiração não é prova de ausência de pagamento.

## 7–8. Referência e persistência

external_reference = ID opaco do documento `payments/{id}` da tentativa, gerado no servidor. Esse documento vincula invoiceId e brandId; o navegador não escolhe a referência.

Armazena provider=mercado_pago, integrationMode=checkout_pro, apiVersion=orders, providerOrderId, externalReference, amountCents, expectedAmount, currency=BRL, invoiceVersion, UUID de idempotência, reserva, status, timestamps e metadados de revisão/reconciliação. A checkoutUrl é armazenada para reutilização segura. Não armazena resposta completa, client_token, Access Token ou segredo de assinatura.

## 9–10. Webhook e assinatura

mercadoPagoCheckoutWebhook aceita type=order e data.id com ID ORD. Confere HMAC-SHA256 no manifesto `id:{data.id em minúsculas};request-id:{x-request-id};ts:{ts};`, com comparação em tempo constante e o secret dedicado existente. Rejeita assinatura ausente/inválida, parâmetros duplicados/malformados, divergência body/query e timestamp futuro. Assinatura antiga só permite retry de evento já persistido.

O body não autoriza pagamento. Após a assinatura, consulta GET `/v1/orders/{id}` autenticadamente. O recebimento do webhook e o retorno do navegador nunca liquidam por si mesmos.

## 11. Critérios de settlement

Somente a consulta server-side pode produzir aprovação. Exige order online/manual, ID consultado correto, vendedor user_id igual ao collectorId configurado, referência correspondente à tentativa, providerOrderId persistido compatível, invoiceId/brandId internos válidos, valores em centavos iguais entre order/tentativa/fatura, moeda BRL e invoiceVersion atual.

Aprovação de Orders exige simultaneamente status=processed, status_detail=accredited e total_paid_amount igual ao total_amount, sem sinais de refund/chargeback/disputa. Autorização sem captura, processamento, criação, falha, valor parcial, estado desconhecido e reembolso não liquidam. Quando live_mode vier na resposta, também é confrontado com a política; a resposta Orders documentada pode omitir esse campo. Não se inventa um valor usando o body do webhook. A conta vendedora esperada e as credenciais do ambiente devem ser conferidas na homologação.

Transação compartilhada preserva limites de versão, histórico/notificação determinísticos, idempotência, marcas de tempo e sinalização de divergências. Pagamento manual prévio seguido de pagamento externo exige revisão de possível duplicidade, sem nova confirmação. As proteções de manageInvoiceDocuments permanecem; providerOrderId também passa a ser evidência externa explícita.

## 12. Reconciliação

reconcileInvoiceCheckout exige Admin ativo antes de consultar o provider. Para tentativas Orders consulta providerOrderId persistido, sem aceitar ID externo arbitrário do browser e sem pesquisar Payments. Usa processCheckoutEvent/settleInvoice, a mesma rotina do webhook. Reconciliação por evento persistido continua disponível.

Se a resposta de criação for perdida antes de salvar o ID, a tentativa fica protegida. Um webhook válido pode recuperar a associação pela referência. Sem ID e sem evento recuperável, é necessária investigação administrativa; não há criação automática de uma nova cobrança para mascarar a incerteza.

## 13–15. UX e flags

CTA habilitado futuramente: **Pagar com outro meio de pagamento**. Não há CTA visível “Pagar com Mercado Pago”. Quando invoiceCheckout=false, a opção inteira fica oculta, sem botão morto ou aviso de indisponibilidade do Mercado Pago. Mantidos loading, erro amigável e redirecionamento exclusivamente à URL validada retornada pelo backend.

`FEATURES.invoiceCheckout = false` e `automatedPayments = false` permanecem intactos. A trava backend INVOICE_CHECKOUT_ENABLED também não foi ativada nesta missão.

## 16–19. Functions, Rules e índices

Functions afetadas: createInvoiceCheckout, mercadoPagoCheckoutWebhook, reconcileInvoiceCheckout e manageInvoiceDocuments. Nenhuma Function nova. Bindings existentes dos dois secrets dedicados foram preservados; não existem novas declarações globais de secrets.

Firestore Rules: sem alterações; browser continua sem escrita financeira técnica e sem acesso para mudar configuração Pix como Cliente/Equipe. Storage Rules: novo caminho exclusivo, leitura autenticada, criação apenas Admin com custom claim, validação de tamanho/MIME e resource==null. Sobrescrita/exclusão direta desse caminho não são autorizadas. Índices, dependências, package/package-lock: sem alterações.

## 20. Validações

- Backend/Functions: 62 testes aprovados, zero falhas/skipped; build tsc incluído.
- Integração/Rules: 93 aprovados (66 integração + 27 Rules), zero falhas/skipped; emuladores locais demo.
- Frontend direcionado: 29 testes em 3 arquivos aprovados antes da suíte completa.
- Suíte frontend completa: 76 arquivos, 331 testes aprovados, zero falhas/skipped, 484,26 segundos. Os 29 testes direcionados estão incluídos nesse total.
- Total distinto validado: 486 testes (331 frontend + 62 backend + 93 integração/Rules).
- TypeScript frontend: aprovado.
- Build frontend: aprovado, 3807 módulos, 44,02 segundos.
- Discovery: 21 Functions em 3883 ms, limite 10000 ms; também verifica secrets por endpoint e database nomeado.
- git diff --check: aprovado.

Falhas intermediárias corrigidas: sobrescrita permitida pelo emulador sem resource==null na regra de criação; mock antigo de edição retornando preferenceId. Warnings preexistentes: chunk Vite maior que 500 kB, depreciação Java/Unsafe, logs de permissão negada nos testes negativos e conversão LF/CRLF. Bloqueios do sandbox em esbuild/Firebase CLI foram resolvidos executando as validações autorizadas fora dele.

Comandos de validação executados (nenhum publica):

```powershell
npm.cmd run test:run -- --reporter=verbose --reporter=json --outputFile.json=orders-frontend.log
npm.cmd --prefix functions run test
firebase.cmd emulators:exec --only firestore,storage --project demo-ts-agency-rules "node --test --test-reporter=tap --test-reporter-destination=orders-integration.log test/rules/*.test.mjs"
npx.cmd tsc --noEmit
npm.cmd run build
node functions/scripts/check-discovery.mjs
git diff --check
```

A primeira execução completa sem saída detalhada foi interrompida localmente para diagnóstico; não foi contabilizada como aprovada. A execução completa posterior com saída detalhada terminou com os resultados acima. Não foi necessária correção adicional de frontend.

## 21–23. Restrições

payments/ e cors.json intactos. Nenhum secret foi definido, solicitado, impresso ou exposto. Nenhum .env real foi criado. Nenhuma chamada a Mercado Pago real: os testes usam transports simulados. Sem deploy, git add, commit ou push. O outro workspace não foi acessado.

## 24. Git status

Status final: 18 arquivos rastreados modificados, quatro arquivos novos da missão (incluindo este relatório), mais cors.json preexistente. Nenhum staged. Logs de teste e arquivos de build/emuladores estão ignorados pelo Git e não integram a publicação.

```text
M functions/src/checkout-payment-processing.ts
 M functions/src/checkout-payment-provider.ts
 M functions/src/checkout-webhook-auth.ts
 M functions/src/invoice-checkout-domain.ts
 M functions/src/invoice-checkout.ts
 M functions/src/invoice-management.ts
 M functions/src/mercado-pago-checkout.ts
 M functions/src/test/invoice-checkout.test.ts
 M src/components/Admin/AgencySettings.tsx
 M src/components/finance/InvoicePaymentOptions.tsx
 M src/test/agency-payment-settings.test.tsx
 M src/test/invoice-checkout-button.test.tsx
 M src/test/invoice-payment-options.test.tsx
 M storage.rules
 M test/rules/checkout-settlement.test.mjs
 M test/rules/invoice-checkout.test.mjs
 M test/rules/invoice-management.test.mjs
 M test/rules/payments.rules.test.mjs
?? cors.json
?? docs/PIX-CHECKOUT-ORDERS-RELATORIO.md
?? functions/src/test/checkout-orders.test.ts
?? src/services/agency-pix-qr.service.ts
?? test/rules/checkout-orders.test.mjs
```

## 25. Homologação manual futura — não executada

1. Revisar este diff e os resultados; excluir cors.json e logs da futura seleção de arquivos.
2. Conferir projeto Firebase gen-lang-client-0975642231, database ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58, região southamerica-east1, bucket e projeto Vercel ts-agency-app.
3. Configurar manualmente apenas os secrets dedicados MERCADO_PAGO_CHECKOUT_ACCESS_TOKEN (teste da nova aplicação) e MERCADO_PAGO_CHECKOUT_WEBHOOK_SECRET, sem reaproveitar os legados.
4. Conferir manualmente MERCADO_PAGO_CHECKOUT_COLLECTOR_ID da conta vendedora de teste e MERCADO_PAGO_CHECKOUT_LIVE_MODE=false; manter produção desabilitada.
5. Mediante autorização separada, publicar as quatro Functions afetadas e Storage Rules; Firestore Rules/índices não precisam de alteração nesta missão. Publicar o frontend no projeto Vercel correto mantendo a flag false em produção.
6. Configurar o webhook Order da nova aplicação para a URL real publicada da Function e verificar assinatura/entrega; não presumir que o tópico antigo payment substitui order.
7. Habilitar flags somente em ambiente isolado de homologação, após nova autorização. Validar a resposta real de Orders, moeda, vendedor, checkout_url e providerOrderId usando contas/cartões oficiais de teste.
8. Homologar pagamento aprovado, pendente, recusado, retorno/abandono, retries, concorrência, evento duplicado, falhas de rede, reembolso, reconciliação administrativa e fatura já confirmada manualmente. Conferir uma única liquidação/histórico/notificação e nenhuma liquidação pelo retorno do browser.
9. Homologar upload/visualização do QR real do banco, incluindo leitura como Cliente, falha de upload e o fluxo manual “Já fiz o pagamento”. Conferir destinatário e ausência de valor fixo.
10. Somente depois de aprovação explícita, planejar credenciais de produção, políticas correspondentes e ativação. Nada dessa ativação foi feito agora.

## Referências oficiais consultadas

- https://www.mercadopago.com.br/developers/en/docs/checkout-pro-orders/create-order?scope=prod
- https://www.mercadopago.com.br/developers/en/reference/online-payments/checkout-pro/create-order/post
- https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-pro/get-order/get
- https://www.mercadopago.com.br/developers/en/docs/checkout-pro-orders/notifications?scope=prod
- https://www.mercadopago.com.br/developers/en/docs/checkout-pro-orders/payment-management/status/order-status?scope=prod
- https://www.mercadopago.com.br/developers/en/docs/checkout-pro-orders/additional-settings/exclude-payment-methods
