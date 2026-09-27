# Mercado Pago — Etapa 2: webhook, liquidação e reconciliação

Data: 26/09/2026. Workspace exclusivo: `C:\Users\samsung\OneDrive\Desktop\ts-agency-app`.

## A. Resumo

Implementação local do webhook dedicado ao Checkout Pro por fatura e da reconciliação administrativa. Ambos consultam o provedor e compartilham uma única política financeira, que usa a quitação interna da Etapa 1. Nenhum retorno do navegador, status do body ou valor informado por cliente/Admin serve de prova de pagamento.

Checkout permanece desativado no frontend e na criação pelo backend. Nenhuma configuração remota, credencial, deploy, git add, commit ou push. Trabalho da Etapa 1 preservado; `payments/` e `marketingAssistant` intactos.

## B. Arquivos criados nesta etapa

- `functions/src/checkout-webhook-auth.ts`: validação da assinatura/formato.
- `functions/src/checkout-webhook.ts`: tratamento HTTP e replay.
- `functions/src/checkout-payment-provider.ts`: consulta autenticada, associação e busca no provedor.
- `functions/src/checkout-payment-processing.ts`: eventos duráveis, política financeira, revisão e reconciliação.
- `functions/src/test/checkout-webhook.test.ts`: testes unitários com transporte simulado e material criptográfico efêmero em memória.
- `test/rules/checkout-settlement.test.mjs`: integração com Firestore emulado.
- Este relatório.

## C. Arquivos alterados nesta etapa

- `functions/src/index.ts`: dois endpoints novos e configuração de leitura do provedor.
- `functions/src/invoice-checkout.ts`: reuso seguro de preferência após recusa e proteção contra webhook antecipado sobrescrito pela resposta de criação.
- `functions/scripts/check-discovery.mjs`: 20 endpoints e bindings exclusivos de secrets.
- `firestore.rules`: duas coleções técnicas novas, leitura Admin e escrita somente backend.
- `src/types.ts`: tipo `checkout_review` nas notificações.
- `test/rules/payments.rules.test.mjs`: testes de isolamento das novas coleções (arquivo na raiz, não no codebase `payments/`).

As demais diferenças no Git já pertenciam à Etapa 1. Não foram descartadas nem refeitas.

## D. Function HTTP

`mercadoPagoCheckoutWebhook`, codebase `default`, região `southamerica-east1`, `onRequest`, transporte público, CORS desativado, timeout 60 s. POST com assinatura válida é obrigatório. A Function antiga `mercadoPagoWebhook` não foi modificada.

HTTP: 405 para método incorreto; 401 para assinatura inválida/ausente ou replay antigo não registrado; 400 para formato inconsistente; 204 para tópico irrelevante autenticado; 200 após resultado durável processado/revisão; 503 para configuração, infraestrutura, consulta indisponível ou associação ausente recuperável. Não confirma recebimento com sucesso antes de registrar/processar o necessário.

## E. Callable de reconciliação

`reconcileInvoiceCheckout`, codebase `default`, região `southamerica-east1`, timeout 300 s. Exige Firebase Auth válido, usuário não desativado/revogado e perfil Admin ativo. Cliente/equipe/Admin inativo são bloqueados antes de consultar o provedor.

Contrato: exatamente `{ paymentId: ID_LOCAL_DA_TENTATIVA }` ou `{ eventId: ID_DO_EVENTO_LOCAL }`. O primeiro busca IDs externos por referência local, depois consulta individualmente cada pagamento. O segundo recupera a identificação externa do evento durável e consulta novamente. Nenhum valor, moeda, role ou status enviado pelo chamador é utilizado.

Sem painel novo nesta etapa: operação disponível como callable autenticada para futura integração administrativa, usando `httpsCallable` da instância existente em `southamerica-east1`. Eventos/pagamentos técnicos podem ser lidos pelo Admin. Não chamar por fetch anônimo nem alterar documentos para forçar liberação.

Busca é limitada: até 50 resultados completos no adapter, até 10 transações por execução de reconciliação. Resultado truncado/excessivo gera erro explícito, sem liquidar silenciosamente apenas parte. Busca vazia não prova ausência definitiva de cobrança e não remove o lock.

## F. Secrets e configuração preparados

- `MERCADO_PAGO_CHECKOUT_ACCESS_TOKEN`: criação da Etapa 1, webhook e reconciliação.
- `MERCADO_PAGO_CHECKOUT_WEBHOOK_SECRET`: somente webhook.
- Bindings por strings nos endpoints, sem SecretParam global ou inicialização do provedor durante discovery.
- Configuração não secreta futura: `MERCADO_PAGO_CHECKOUT_COLLECTOR_ID` e `MERCADO_PAGO_CHECKOUT_LIVE_MODE` (`true` ou `false`, explícito).

Nenhum desses valores foi solicitado ou configurado. Não há token fake, token em `.env`, `VITE_*`, Firestore ou frontend. Testes criptográficos usam bytes aleatórios efêmeros, sem representar credenciais configuradas. O gate de criação permanece desligado; webhook/reconciliação não dependem dele para recuperar pagamentos já existentes quando futuramente configurados.

## G. Autenticidade e replay

HMAC-SHA256 do manifesto oficial `id:DATA_ID;request-id:REQUEST_ID;ts:TIMESTAMP;`, com ID normalizado e comparação em tempo constante. `data.id` vem da query assinada e deve concordar com o body. Payment ID aceita somente dígitos; IDs de documentos/caminhos são validados. Não se usa o ID de evento do body para deduplicação, pois o body não é a prova criptográfica.

Aceita timestamps em segundos ou milissegundos. Futuro acima de 5 minutos é rejeitado. Assinatura com mais de 10 minutos só pode reprocessar entrega cujo hash do manifesto já esteja registrado; novas entregas antigas são rejeitadas e podem ser recuperadas por reconciliação. Evento já processado é idempotente. Novos eventos sempre consultam o estado atual do provedor.

Referência oficial: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro-preferences/payment-notifications

## H. Consulta ao Mercado Pago

GET autenticado por Bearer para `/v1/payments/{id}`, `/merchant_orders/{id}` e `/checkout/preferences/{id}`. As consultas comprovam pagamento → ordem → preferência → referência externa/fatura, com recebedor compatível. Reconciliação usa `/v1/payments/search` por referência e valida cada resultado individualmente.

Host fixo `api.mercadopago.com`, sem redirecionamento HTTP, timeout de 5 segundos por GET. Nenhuma URL do webhook é usada como destino de consulta. Respostas não são armazenadas integralmente; não são persistidos dados de cartão, pagador, token ou assinatura. Logs operacionais são códigos genéricos, sem corpo remoto ou exceção sensível.

Referências: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/get-payment/get e https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/payment-management (apenas documentação do endpoint compartilhado de busca; nenhuma assinatura implementada).

## I. Valor, moeda e associação

Conferidos: ID externo consultado; recebedor esperado; modo teste/produção; inclusão do pagamento na ordem; referência da ordem/preferência/pagamento; ID e item único da preferência; quantidade 1; moeda/valor da preferência; ID local da tentativa; integrationMode/provider; preferência local quando já conhecida; invoiceId; brandId; valor em centavos; moeda BRL; fingerprint da obrigação atual.

Dados da fatura e da tentativa segura são a obrigação oficial. Divergência não quita: registra revisão e notifica Admin. Fatura inexistente, marca divergente, associação ausente ou estado inadequado não são corrigidos por suposição. Associação local incompleta pode recuperar preferenceId a partir da cadeia consultada no provedor.

## J. Status

| Provedor | Política |
|---|---|
| approved | Liquida somente após todas as validações e estado elegível. |
| pending / in_process / authorized | Mantém obrigação aberta e régua normal; guarda estado externo. |
| rejected / cancelled / expired | Não cancela dívida; marca tentativa recusada. |
| desconhecido | Revisão, sem quitação. |
| refunded / charged_back / chargeback / contested / in_mediation ou valor reembolsado | Revisão; nunca reabre dívida paga nem suspende acesso. |

Recusa permite reutilizar a MESMA preferência somente se vigente, versão igual, sem revisão e sem outra transação conhecida pendente. Não cria outra preferência automaticamente. Expiração, busca vazia e incerteza não liberam novas cobranças.

## K. Idempotência e ordem

`checkout_webhook_events/{hash}` guarda recebimento, tentativas, estado e resultado. `checkout_provider_payments/{externalId}` mantém associação local e watermark por transação externa. Consultas antigas não sobrescrevem versão mais recente; regressão de aprovação ou conflito exige revisão.

Liquidação, histórico, notificação comum, estado local/externo e conclusão do evento são gravados atomicamente. Transações Firestore podem repetir; GET/POST externo nunca fica dentro do callback transacional. Eventos diferentes da mesma transação usam o mesmo ID de liquidação `mercado_pago:ID_EXTERNO`. Outro pagamento aprovado para a mesma fatura é revisão, não segunda baixa.

## L. Evento antecipado

Evento fica durável antes da consulta. Falha/timeout do provedor ou associação ainda ausente recebe `retryable` e HTTP 503 para retentativa. Admin também pode reconciliar pelo eventId. Não há 200 que esquece evento recuperável. Se a reserva existir antes do retorno de criação, a cadeia externa pode completar a associação; resposta tardia da criação não sobrescreve o processamento do webhook.

Não foi criado scheduler extra: recuperação é por retries do provedor e callable Admin. Deve haver monitoramento operacional de eventos retryable na homologação/publicação.

## M. Corrida Admin × webhook

Ambos utilizam `settleInvoice` lendo a mesma fatura em transação. Uma baixa vence; a outra reavalia o estado confirmado. IDs de histórico e notificação são determinísticos. Se o automático vencer, confirmação manual posterior não duplica. Se o manual vencer, chegada de cobrança externa aprovada sinaliza possível duplicidade.

## N. Pagamento duplicado

Pix já confirmado + Mercado Pago aprovado: mantém a fatura paga, registra `possible_duplicate_payment`, `requiresReview` e `reconciliationRequired`, com alerta administrativo. Cliente não recebe segunda confirmação normal. Não há reembolso, cancelamento remoto ou ajuste automático de dívida. Alertas de revisão permanecem até análise operacional; reconciliação não representa autorização para apagar pendências críticas.

## O. Notificações

Cliente: mesma notificação “Pagamento confirmado” e histórico comum da Etapa 1, ator Sistema, sem Admin falso. Admin: `checkout_review`, uma notificação por recurso/motivo/destinatário ativo. IDs determinísticos não resetam leitura nem data em retries. Sem destinatários ativos, revisão permanece no registro durável e requer monitoramento.

## P. Lembretes

`sendInvoiceReminders` preservado. Fatura paga deixa a régua; estados externos pendentes/recusados não congelam dívida. `payment_reported` segue exclusivamente manual e mantém a política anterior. Dez dias de atraso continuam gerando somente notificação administrativa, sem suspensão.

## Q. Pix manual

Chave, tipo, QR, cópia, valor, reporte e confirmação manual preservados. Nenhum Pix Mercado Pago, Orders Pix ou Checkout Transparente criado.

## R. Recorrência

Cada invoice permanece independente. Não há alteração em recurrenceGroupId, geração recorrente ou criação de assinatura. Tests verificam que a parcela seguinte permanece aberta.

## S. Rules/indexes

Adicionadas somente as regras de `checkout_webhook_events/{eventId}` e `checkout_provider_payments/{paymentId}`: leitura Admin ativo; escrita direta negada inclusive a Admin. Admin SDK é o escritor. Cliente/equipe/anônimo não leem. Regras da Etapa 1 permanecem.

Nenhum índice composto novo: consultas de associação usam igualdade em um campo (indexação automática já padrão). Nenhuma alteração em Storage Rules, firebase.json, banco remoto ou `payments/`. Banco nomeado existente preservado.

## T. Testes

Frontend: **13 arquivos, 63 testes aprovados**, zero falhas/skipped. Cobrem checkout/botão, Pix, configurações, domínio/service/repository/dialogs de faturas, callables de reporte/confirmar, fluxo financeiro, notificações e flag do legado.

Backend: **57 testes aprovados**, zero falhas/skipped, por `npm.cmd --prefix functions run test` (inclui build). Sete testes novos validam assinatura/formato/replay, rejeição antes de inicializar serviços, cadeia consultada, associação divergente, erro/timeout e busca limitada. Testes existentes de Auth verificam sessão ausente/desativada/revogada.

Integração/Rules: **61 testes aprovados**, zero falhas/skipped, por `firebase.cmd emulators:exec --only firestore,storage --project demo-ts-agency-rules "node --test test/rules/*.test.mjs"`. São 17 novos de liquidação/webhook/reconciliação, 8 da criação da Etapa 1, 12 do financeiro existente e 24 de Rules/Storage. Provider integralmente simulado; somente projeto demo e bancos de emulador.

Cobertura: approved direto, duplicação e concorrência; todos os estados solicitados; divergências monetárias/moeda/referência/associação/recebedor/modo; fatura ausente/encerrada; evento antecipado; falha/timeout recuperável; Pix confirmado antes do approved; corrida Admin/webhook; duas transações na mesma preferência; Admin versus cliente/equipe/inativo; reconciliação de evento e busca vazia; webhook durante criação; assinatura até liquidação; lembretes/recorrência/Rules. Nenhum teste acessou Mercado Pago real. A suíte frontend completa não foi executada.

## U. TypeScript/build/discovery/diff

`npx.cmd tsc --noEmit`: aprovado. `npm.cmd run build`: aprovado em 42,15 s. Build Functions: aprovado pelo script de testes após o ajuste de múltiplas tentativas. `node functions/scripts/check-discovery.mjs`: 20 endpoints em 2.742 ms, limite 10.000 ms, bindings de secrets isolados. `git diff --check`: aprovado. `git diff --name-only -- payments` e `git diff --cached --stat`: vazios.

## V. Warnings e intercorrências

Build mantém warning do chunk principal de 866,24 kB, já presente na Etapa 1. Emuladores emitem warning Java sun.misc.Unsafe, avaliação negativa de `category` ausente no teste legado de Storage e PERMISSION_DENIED esperado nos testes de bloqueio. Git avisa LF → CRLF.

Sandbox inicialmente impediu leitura do configstore e dos arquivos de configuração do esbuild; as execuções foram repetidas com a permissão local apropriada. A continuação perdeu os identificadores de processos da execução anterior; validações sem resultado final disponível foram repetidas. Não foi atribuída falha nova a teste antigo.

## W. Functions exatas desta etapa

- Nova HTTP: `mercadoPagoCheckoutWebhook`.
- Nova callable: `reconcileInvoiceCheckout`.
- Alterada internamente: `createInvoiceCheckout` (reuso da preferência recusada e corrida com webhook).
- `confirmInvoicePayment` usa a rotina da Etapa 1, sem nova mudança nesta etapa. `reportInvoicePayment` e `sendInvoiceReminders` preservados. Nenhuma Function antiga removida/substituída.

## X. Antes de homologação/deploy

Obter autorização; provisionar futuramente os dois secrets e suas permissões; definir recebedor e modo explícitos; configurar no painel Mercado Pago o webhook assinado do evento Pagamentos na aplicação correta, sem substituir inadvertidamente a integração antiga. A preferência não contém notification_url: utiliza configuração futura da aplicação.

Homologar com conta de teste a cadeia payment → merchant_order → preference, campos/valores reais, assinatura, relógio, retentativas longas e retorno ao navegador. Falta qualquer validação externa real: todos os testes desta missão usam mocks e emulador. Homologar política de replay de 10 minutos; retries já registrados são aceitos, novos eventos muito antigos exigem recuperação administrativa.

Planejar observabilidade de retryable/requiresReview, acesso operacional à callable (sem painel novo), retenção dos eventos, política de fatura editada/cancelada com preferência aberta, análise de reembolsos e cobranças duplicadas. Não apagar locks para liberar novas preferências. Limites de busca exigem revisão especializada se excedidos.

Revisar publicação seletiva das Functions novas/alteradas e Rules no codebase default/banco nomeado. Não usar deploy geral que inclua payments. Continuar com flags de criação desligadas até homologação e autorização explícita. Nenhuma dessas ações remotas foi executada.

## Y. Git

Estado acumulado das Etapas 1 e 2: 13 arquivos rastreados modificados, 20 arquivos não rastreados (19 da missão acumulada, incluindo relatórios, e `cors.json` preexistente). Nenhum arquivo em staging e nenhuma operação de publicação executada.

```text
 M firestore.rules
 M functions/scripts/check-discovery.mjs
 M functions/src/index.ts
 M functions/src/invoice-billing.ts
 M src/components/Admin/AgencySettings.tsx
 M src/components/finance/InvoiceHistoryView.tsx
 M src/components/finance/InvoicePaymentOptions.tsx
 M src/config/features.ts
 M src/invoices/payment-settings.ts
 M src/test/agency-payment-settings.test.tsx
 M src/test/invoice-payment-options.test.tsx
 M src/types.ts
 M test/rules/payments.rules.test.mjs
?? cors.json
?? docs/MERCADO-PAGO-ETAPA-1-RELATORIO.md
?? docs/MERCADO-PAGO-ETAPA-2-RELATORIO.md
?? functions/src/checkout-payment-processing.ts
?? functions/src/checkout-payment-provider.ts
?? functions/src/checkout-webhook-auth.ts
?? functions/src/checkout-webhook.ts
?? functions/src/invoice-checkout-domain.ts
?? functions/src/invoice-checkout.ts
?? functions/src/invoice-settlement.ts
?? functions/src/mercado-pago-checkout.ts
?? functions/src/test/checkout-webhook.test.ts
?? functions/src/test/invoice-checkout.test.ts
?? src/data/functions/invoice-checkout.functions.ts
?? src/hooks/useInvoiceCheckout.ts
?? src/services/invoice-checkout.service.ts
?? src/test/invoice-checkout-button.test.tsx
?? src/test/invoice-checkout.test.tsx
?? test/rules/checkout-settlement.test.mjs
?? test/rules/invoice-checkout.test.mjs
```
