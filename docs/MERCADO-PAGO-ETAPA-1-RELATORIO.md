# Mercado Pago — Etapa 1: núcleo seguro por fatura

Data: 26/09/2026. Workspace: `C:\Users\samsung\OneDrive\Desktop\ts-agency-app`.

## A. Resumo

Implementado e validado localmente o núcleo do Checkout Pro por fatura, no codebase `default`. Permanece desativado: `FEATURES.invoiceCheckout = false` e backend exige `INVOICE_CHECKOUT_ENABLED === 'true'` mais secret configurado. Não houve chamada real ao Mercado Pago, configuração remota, deploy, staging, commit ou push. `payments/` permaneceu sem alterações. `cors.json` já estava não rastreado no início e foi preservado.

## B. Arquivos criados

- `functions/src/invoice-checkout-domain.ts`
- `functions/src/invoice-checkout.ts`
- `functions/src/mercado-pago-checkout.ts`
- `functions/src/invoice-settlement.ts`
- `functions/src/test/invoice-checkout.test.ts`
- `src/data/functions/invoice-checkout.functions.ts`
- `src/services/invoice-checkout.service.ts`
- `src/hooks/useInvoiceCheckout.ts`
- `src/test/invoice-checkout.test.tsx`
- `src/test/invoice-checkout-button.test.tsx`
- `test/rules/invoice-checkout.test.mjs`
- Este relatório.

## C. Arquivos alterados

- `functions/src/index.ts`: export da nova callable, lazy imports, gate e secret exclusivo.
- `functions/src/invoice-billing.ts`: confirmação manual delega à quitação comum.
- `functions/scripts/check-discovery.mjs`: verifica 18 exports e isolamento dos secrets.
- `firestore.rules`: privacidade das tentativas hospedadas e bloqueio de reservas.
- `src/components/finance/InvoicePaymentOptions.tsx`: botão por fatura, loading, erros; Pix preservado.
- `src/components/Admin/AgencySettings.tsx`: retira campo de link global.
- `src/components/finance/InvoiceHistoryView.tsx`: reconhece ator interno Sistema.
- `src/config/features.ts`: flag desativada do checkout novo.
- `src/invoices/payment-settings.ts`: tolera campo legado sem usá-lo como pagamento.
- `src/types.ts`: histórico aceita ator `system`.
- `src/test/agency-payment-settings.test.tsx`
- `src/test/invoice-payment-options.test.tsx`
- `test/rules/payments.rules.test.mjs` (teste de Rules na raiz; não pertence a `payments/`).

## D. Arquitetura final

Componente → hook → service → DAL `httpsCallable` → `createInvoiceCheckout` → Firebase Auth → autorização em transação → fatura Firestore → reserva em `payments` + `invoice_checkout_locks` → provider fora da transação → persistência → URL HTTPS validada.

Região `southamerica-east1`; instância Firebase existente; Admin SDK usa o banco nomeado existente `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58` (ou override explícito de ambiente já suportado pelo projeto). Nenhum banco/configuração remota foi alterado.

Provider usa POST `/checkout/preferences`, `init_point`, expiração de uma hora e `external_reference` igual ao ID local da tentativa. `preferenceId` é um campo separado; não representa um pagamento aprovado. Não há Orders Pix, SDK novo, campos de cartão, assinatura ou dependência do codebase antigo. Pix é excluído da preferência; Pix manual continua no aplicativo. Retornos apontam à área financeira do cliente e não quitam fatura.

Referência da API: https://www.mercadopago.com.br/developers/pt/reference/online-payments/checkout-pro-preferences/create-preference/post

## E. Autenticação/autorização

Callable usa transporte público para compatibilidade com navegador/CORS, mas exige Firebase Auth dentro do handler. Reutiliza `authenticatedBillingActor`, que consulta o usuário no Auth, rejeita desativado/ausente e compara `auth_time` com revogação. Em transação: Admin ativo pode operar conforme política atual; cliente precisa ter marca com acesso habilitado e ser dono da fatura. Perfis de equipe e Admin inativo são negados. A flag desligada não substitui autorização quando o checkout for ativado.

`invoiceId` aceita somente 1–128 caracteres alfanuméricos, `_` e `-`, sem caminhos. Cliente não recebe documentos técnicos, apenas URL e expiração.

## F. Proteção do valor

Browser envia somente `invoiceId`. Backend ignora campos financeiros adulterados e lê marca, valor, descrição, moeda e estado no Firestore. Valor positivo, finito, representável em centavos inteiros seguros e pelo menos um centavo; moeda BRL. Fingerprint inclui marca, valor em centavos, moeda, descrição e vencimento. Faturas pagas, canceladas, suspensas e estados desconhecidos não abrem checkout. `payment_reported` continua aguardando conferência manual e também bloqueia checkout.

## G. Idempotência

Reserva transacional única por fatura. Duas chamadas concorrentes não disparam dois POSTs. `ready` com fingerprint idêntico e não expirado reutiliza URL. Ref no hook impede duplo clique mesmo antes do próximo render.

Somente rejeição HTTP explícita 400/401/403/422 é tratada como falha definitiva que permite outra tentativa. Timeout, falha de rede, 5xx ou resposta inválida viram resultado incerto e bloqueiam novo POST. Se o provider tiver sucesso e a gravação posterior falhar, a reserva permanece `creating`, igualmente bloqueada. Não se pressupõe suporte a um header de idempotência da API Preferences.

Expiração, edição financeira e resultado incerto não liberam cobrança automaticamente. Exigem reconciliação/revisão na próxima etapa; não apagar locks para tentar novamente. Alteração durante a criação coloca a preferência em `requires_review`. Isso evita duplicação, mas não cancela uma preferência remota já criada nem um link já aberto.

Campos técnicos: invoiceId, brandId, provider, integrationMode, externalReference, amountCents, currency, invoiceVersion, idempotencyKey, reservationOwner, status, providerStatus, timestamps, expiresAt, requiresReview/reconciliationRequired; preferenceId e checkoutUrl após resposta válida. `providerStatus` fica null nesta etapa, pois não há confirmação remota de pagamento.

## H. Pix manual

Preservados chave, tipo, QR, cópia, valor exibido pela área financeira, “Já fiz o pagamento”, callable de reporte e confirmação administrativa. Testes cobrem clipboard, erro de QR, reporte, confirmação, histórico, notificação e recorrência independente. Nenhuma alteração de `recurrenceGroupId` ou geração recorrente.

## I. Link global

`mercadopagoPaymentLink` saiu da interface de Configurações e não é lido pelo botão novo nem usado como fallback. Modelo e leitura de documentos antigos continuam tolerantes, inclusive valor legado inválido não impede salvar Pix. Nenhum campo remoto foi apagado; nenhuma migração. Helper legado permanece por compatibilidade, sem utilização no novo pagamento.

## J. Quitação futura

`settleInvoice` é rotina interna, sem callable própria. Confirmação manual mantém autenticação Admin, campos, IDs determinísticos de histórico/notificação e idempotência anteriores. Origem futura `verified_provider` usa ator `system:mercado-pago`, nunca Admin falso. Confere marca, valor, moeda e fingerprint; discrepância, pagamento manual informado ou outra transação para fatura já paga exigem revisão. Nenhum retorno/query string/browser chama quitação.

Webhook futuro deverá autenticar e validar evidência do provedor antes de chamar essa rotina em transação, além de atualizar pagamento/evento de forma idempotente. O webhook definitivo, assinatura, consulta remota e reconciliação não estão implementados nem publicados.

## K. Testes executados

- Frontend: 13 arquivos relacionados, 63 testes aprovados (duas execuções complementares: 5/32 e 8/31), zero falhas finais e zero skipped.
- Backend `npm.cmd --prefix functions run test`: build + 50 testes aprovados, zero falhas/skipped. Inclui autenticação desativada/revogada reutilizada, domínio monetário e provider simulado.
- Emuladores: `firebase.cmd emulators:exec --only firestore,storage --project demo-ts-agency-rules "node --test test/rules/*.test.mjs"`: 43 testes aprovados, zero falhas/skipped. Inclui 8 de checkout, 12 de financeiro existente e 23 de Rules/Storage.
- Cobertura nova: propriedade/forja de dados, estados, concorrência, retry conhecido/incerto, reuso, falha de persistência após sucesso externo, alteração durante POST, expiração, URLs inseguras, botão/loading/erro, ausência de quitação por retorno e quitação comum.

Arquivos frontend executados: invoice-checkout, invoice-checkout-button, invoice-payment-options, agency-payment-settings, finance-view, invoice-billing-flow, invoice-domain, invoice-service, invoice-repository, invoice-dialogs, invoice-billing-functions, notifications e payment-feature-flag (extensões conforme repositório).

Uma execução intermediária falhou porque o teste antigo ainda esperava “Pagar com cartão” via link global. Expectativa atualizada e reexecução aprovada. Nenhuma falha restante foi ocultada. Não executada suíte frontend completa.

## L. Warnings

Vite: chunk principal acima de 500 kB (866,24 kB minificado); build aprovado e chunks de rotas preservados. Não foi realizado build comparativo do HEAD para atribuir a variação desta execução.

Emuladores: warning de API Java `sun.misc.Unsafe`, avaliação de propriedade `category` ausente em teste negativo de Storage e logs esperados `PERMISSION_DENIED`. Testes terminaram com sucesso; Storage Rules não foram alteradas.

Git: avisos LF → CRLF. Sandbox inicialmente bloqueou leitura de configuração pelo esbuild e configstore do Firebase CLI; repetições autorizadas fora dessa restrição passaram. Não eram erros de código.

## M. Validações

- `npx.cmd tsc --noEmit`: aprovado, inclusive novos testes frontend.
- `npm.cmd run build`: aprovado (41,46 s).
- Build Functions: aprovado pelo script de testes, após ajuste final de validação de centavos.
- `node functions/scripts/check-discovery.mjs`: aprovado; 18 endpoints em 5.664 ms, limite 10.000 ms, secret novo isolado e secret OpenAI preservado.
- `git diff --check`: aprovado.
- `git diff --name-only -- payments`: vazio.

## N. Functions novas/alteradas

- **Nova:** `createInvoiceCheckout`, callable, codebase `default`, região `southamerica-east1`, timeout 60 s, secret string `MERCADO_PAGO_CHECKOUT_ACCESS_TOKEN` vinculado exclusivamente a ela, sem parâmetro secret global.
- **Alterada:** `confirmInvoicePayment`, mesma callable/configuração, execução interna delega à quitação compartilhada.
- `reportInvoicePayment` e `sendInvoiceReminders` não tiveram handlers nem lógica alterados; compartilham módulo que passou a importar a quitação. Regressões testadas.
- Nenhuma outra Function alterada; `marketingAssistant` e Functions do codebase `payments` preservadas. Nenhum webhook novo exportado.

## O. Rules e índices

Somente `firestore.rules`:

1. `payments/{paymentId}`: cliente não lê registros `integrationMode == checkout_pro`; Admin mantém leitura; gravação direta continua negada.
2. `payments/{paymentId}/attempts/{attemptId}`: mesma restrição baseada no registro pai.
3. `invoice_checkout_locks/{invoiceId}`: leitura/escrita cliente SDK negadas inclusive a Admin; exclusivo backend.

Nenhum índice novo/alterado: acesso ao lock é por ID de documento. Nenhuma alteração em Storage Rules, firebase.json ou banco remoto. Consultas legadas amplas de payments poderão precisar filtro compatível antes de sua futura reativação; módulo legado permanece desligado.

## P. Pendências antes de publicação/ativação

Esta entrega conclui a preparação local solicitada, não autoriza ativar cobrança real.

Antes de publicar a nova Function: autorização explícita; provisionamento futuro do secret isolado e permissões da conta de execução; revisão do deploy seletivo no codebase default e banco nomeado. Secret obrigatório pode impedir deploy enquanto não existir, mesmo com gate desligado. Não utilizar deploy geral que reative `payments`.

Antes de habilitar o checkout ao usuário: webhook validado, consulta confiável ao provedor, deduplicação de eventos, reconciliação de `creating`/`unknown`/expirados, política de edição/cancelamento de faturas com preferência aberta, tratamento de pagamento duplicado após Pix manual, homologação real de Checkout Pro em conta de teste e validação de meios/expiração/retorno. Só depois habilitar backend e frontend. O retorno para `/cliente/financeiro` também deve ser homologado para Admin (guards existentes permanecem).

Publicação futura deverá contemplar nova callable, confirmação manual refatorada, Rules e frontend. Nenhuma credencial foi solicitada, gravada, impressa ou configurada. Nenhum teste exigiu credencial Mercado Pago.

## Q. Estado Git final

13 arquivos rastreados modificados, 12 arquivos novos desta missão (incluindo relatório), todos sem staging. `cors.json` continua não rastreado e preexistente. A lista de B/C corresponde às mudanças da missão. `payments/` sem diff. Nenhum deploy, git add, commit ou push foi executado.
