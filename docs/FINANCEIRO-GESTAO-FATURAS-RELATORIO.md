# Financeiro — Gestão de faturas, filtros e recorrências

Workspace: `C:\Users\samsung\OneDrive\Desktop\ts-agency-app`.
Data: 27/09/2026. Trabalho local, sem publicação. Checkout Mercado Pago desativado.

## A. Resumo e ponto da retomada

A implementação principal já estava escrita quando ocorreu a interrupção: filtros, diálogo de gestão, camada callable/service/hook, backend transacional, adaptação do editor e Rules. Não foi reiniciada nem duplicada.

Os arquivos parcialmente alterados da missão eram `firestore.rules`, `functions/src/index.ts`, `functions/scripts/check-discovery.mjs`, `src/components/FinanceView.tsx`, `src/components/finance/InvoiceDialog.tsx`, `src/components/finance/InvoiceHistoryView.tsx`, `src/services/invoices.service.ts`, `src/types.ts`, além dos seis arquivos novos de implementação listados em B. As alterações anteriores de Mercado Pago também estavam presentes e foram preservadas.

Na última interrupção já haviam passado 57 testes backend, 81 testes de integração/Rules, 74 testes frontend em 15 arquivos, TypeScript corrigido, build frontend e discovery. Restavam dois testes adicionais de filtros Admin/Cliente, a rodada final após endurecer a validação de comandos, o teste de lembretes após edição e este relatório. O identificador do processo de emulador interrompido não estava mais disponível; a rodada sem resultado final foi retomada. Resultados anteriores aprovados não foram descartados.

Durante a retomada da implementação foram corrigidos: uso de Timestamp na ordenação de pagas; calendário de São Paulo também nos estados visuais; edição de série apenas dos campos efetivamente alterados; corte da série considerando o novo dia; precisão de nanossegundos na detecção de prévia obsoleta; metadados de suspensão/cancelamento; bloqueio de mistura de edição financeira com comandos de transição. Foram acrescentados os testes específicos.

## B. Arquivos criados nesta missão

- `functions/src/invoice-management.ts`: autorização, edição, prévia, confirmação, exclusão e auditoria transacionais.
- `src/invoices/invoice-filters.ts`: filtros e ordenação civil.
- `src/data/functions/invoice-management.functions.ts`: chamada tipada.
- `src/services/invoice-management.service.ts`: comandos e mensagens de erro.
- `src/hooks/useInvoiceManagement.ts`: estado de execução, prevenção de envio duplicado e erros.
- `src/components/finance/InvoiceManagementDialog.tsx`: gestão, prévia e confirmação.
- `src/test/invoice-filters.test.ts`.
- `src/test/invoice-management-dialog.test.tsx`.
- `test/rules/invoice-management.test.mjs`.
- Este relatório.

Os arquivos novos de checkout/webhook e seus relatórios já pertenciam às Etapas 1 e 2; não são uma nova implementação nesta missão. `cors.json` também era preexistente.

## C. Arquivos alterados nesta missão

`firestore.rules`; `functions/src/index.ts`; `functions/scripts/check-discovery.mjs`; `src/components/FinanceView.tsx`; `src/components/finance/InvoiceDialog.tsx`; `src/components/finance/InvoiceHistoryView.tsx`; `src/invoices/invoice-domain.ts`; `src/services/invoices.service.ts`; `src/types.ts`; `src/test/finance-view.test.tsx`; `src/test/invoice-billing-flow.test.tsx`; `src/test/invoice-service.test.ts`; `test/rules/payments.rules.test.mjs`.

O diff acumulado também contém arquivos de Mercado Pago modificados antes desta missão. Não atribuir todas as linhas do diff a esta entrega. Nenhuma alteração em `payments/`, `cors.json`, configuração de secrets ou no banco remoto.

## D. Filtros

O seletor existente foi adaptado para Em aberto / Futuras / Pagas / Todas. Em aberto inclui `pending`, `overdue` e `payment_reported` com vencimento até o último dia do mês corrente, inclusive vencidas de meses/anos anteriores. Futuras inclui esses mesmos estados nos meses posteriores. Pagas inclui somente `paid`. Todas inclui também suspensas e canceladas. O padrão inicial é Em aberto.

## E. Ordenação

Em aberto, Futuras e Todas: vencimento civil crescente, convertido em data real, com ID como desempate estável. Pagas: Timestamp de confirmação decrescente, com vencimento como fallback para registros legados sem confirmação. A ordem retornada pelo repository não determina a ordem visual. Não foi necessário trocar os índices existentes das consultas.

O mês/dia corrente usa `America/Sao_Paulo`; a apresentação de atraso e a validação temporal de promessa usam o mesmo calendário. Futuras tem cabeçalhos por mês/ano. Testes cobrem virada UTC ainda no dia/mês anterior em São Paulo, anos diferentes, fevereiro e ano bissexto.

## F. UX Admin

Ações existentes mantidas e complementadas com Excluir e Gerenciar recorrência. A exclusão individual abre prévia e exige confirmação explícita. Fatura paga tem exclusão desabilitada com explicação; seu editor limita a observação. Estados informado/suspenso/cancelado também bloqueiam os campos financeiros no editor. Associações externas são analisadas no backend e retornam explicação quando impedem a operação.

Gerenciar recorrência mostra descrição, valor da parcela selecionada, primeira/última parcela existente, total, pagas, em aberto e futuras. Permite voltar ao editor individual, editar esta e próximas, excluir somente esta, excluir esta e próximas ou remover anteriores a uma data. Apenas os campos alterados no formulário de série são enviados, para não sobrescrever valores particulares das outras parcelas.

## G. UX Cliente

Mesmos quatro filtros e agrupamento por mês, restritos às faturas acessíveis do próprio cliente. Sem ações de gestão administrativa. Pix, boleto, informação de pagamento e suporte continuam disponíveis conforme o estado da cobrança. Equipe continua sem Financeiro; não há nova concessão em rotas, consultas ou Rules.

## H. Edição individual

Reutiliza `InvoiceDialog` e o service existente. O service envia campos permitidos à nova callable. Valor, descrição, vencimento, competência, observação e meios administrativos já existentes são validados no backend. Não permite mudar ownership, status, grupo ou `invoiceVersion` pelo payload de edição. A associação de boleto exige mídia da mesma marca e categoria `invoice`. Editar somente esta não modifica outras parcelas.

## I. Proteções da edição

Backend consulta fatura, histórico, notificações, pagamentos associados e lock de checkout antes de gravar. Paid, evidência de confirmação, pagamento informado/promessa, histórico financeiro relevante e qualquer tentativa externa impedem mudança crítica. A política é conservadora: inclusive tentativa externa falha/encerrada permanece protegida, sem apagar locks nem invalidar cobranças remotas silenciosamente.

Correção individual exclusivamente de observação é permitida sem alterar a evidência financeira. Transições não aceitam alterações financeiras embutidas. Cancelar/suspender com checkout associado continua bloqueado até revisão; cancelar não encerra uma preferência remota.

## J. Exclusão individual

Somente Admin ativo e autenticado. Exclusão física exige ausência de pagamentos, informação/promessa de pagamento, tentativa externa, checkout, boleto e histórico/notificações relevantes. Histórico `created` e notificações `invoice_created` são removidos junto com a cobrança equivocada. Histórico financeiro obrigatório não é apagado. A decisão não depende da UI nem de contagens enviadas pelo navegador.

## K. Edição da recorrência

Somente o mesmo `recurrenceGroupId`, mesma marca e vencimentos iguais/posteriores ao da parcela selecionada. Anteriores permanecem intactas. Alterações possíveis: valor, descrição, observação, dia de vencimento e encurtamento do término. Dias 29/30/31 sofrem clamp no último dia real de cada mês, inclusive fevereiro bissexto. Competência não muda automaticamente ao ajustar o dia dentro do mesmo mês.

Encurtar remove apenas parcelas elegíveis futuras posteriores ao novo término; pagas e protegidas permanecem e são listadas na prévia. O novo dia de vencimento participa do cálculo do corte. A operação não estende a série nem gera parcelas novas. `recurrenceEnd` é atualizado nas parcelas elegíveis editadas; uma parcela protegida mantida pode permanecer além do término pretendido, explicitamente informada.

## L. Exclusão da recorrência

Excluir esta e próximas usa o mesmo grupo e o corte pelo vencimento da parcela selecionada. Remover anteriores a usa limite estrito (`dueDate < data`). Nenhuma outra série é atingida. As parcelas protegidas ficam no banco e no histórico; não são marcadas pagas nem canceladas automaticamente para simular uma remoção.

## M. Preview e confirmação

Prévia não altera faturas. Cria somente um registro administrativo privado com comando, autor, validade de dez minutos, resumo e fingerprint das evidências. Confirmação usa apenas o ID da prévia; reabre uma transação, valida Admin, relê documentos/associações e compara a situação atual. Alteração concorrente exige nova prévia. Prévia de outro Admin é recusada. Repetir uma confirmação concluída devolve o resultado salvo, sem duplicar efeitos.

A UI apresenta quantidades alteradas, removidas, preservadas e protegidas, com motivos e checkbox de confirmação. Protegidas são um subconjunto de preservadas, não uma quantidade adicional. Cancelar não grava alterações nas faturas.

Estratégia de limites: uma transação atômica por operação; no máximo 60 parcelas, compatível com o criador existente, e teto preventivo de 450 gravações. Histórico/notificações com mais de 60 registros protegem a parcela. Operações maiores são recusadas explicitamente antes da prévia executável, sem aplicação parcial. Séries legadas maiores que 60 exigem revisão especializada; não há chunking silencioso.

## N. Série criada desde 2024

Gerenciar recorrência → Remover faturas anteriores a → data → Gerar prévia → conferir → confirmar. O teste cria 38 parcelas desde janeiro/2024 e usa corte em novembro/2026: 32 removíveis, seis preservadas, das quais duas pagas/protegidas. Confirmação remove somente as 32 elegíveis. Não foi executada limpeza em produção.

## O. Faturas protegidas

Prévia lista vencimento e motivo. Pagas/confirmadas, pagamento informado/promessa, tentativas externas, checkout, boleto e histórico/notificação relevante impedem exclusão. Edição crítica bloqueia situações incompatíveis; observação individual não destrutiva é a exceção. Para casos protegidos, preservar e revisar individualmente; cancelamento é alternativa apenas quando permitido, nunca forma de apagar evidência ou fechar checkout remoto.

## P. Compatibilidade Mercado Pago

Etapas 1 e 2 preservadas. `FEATURES.invoiceCheckout` continua `false`; não foi habilitado o gate do backend nem configurado secret. Os testes usam provider simulado/emuladores. Nenhuma chamada real ao Mercado Pago. Política de gestão bloqueia ajuste crítico/exclusão diante de qualquer pagamento local associado ou lock, independentemente de `providerStatus`, inclusive incerteza externa. Webhook/reconciliação mantêm as proteções existentes contra versão/valor divergente.

## Q. invoiceVersion

Edição válida recalcula o fingerprint canônico existente (marca, centavos, moeda, descrição e vencimento). Observação e metadados não alteram esse fingerprint. O checkout consulta dados atuais, não uma versão confiada ao navegador. Testes verificam edição seguida de checkout com novo valor/versão, bloqueio da edição após reserva e recusa de reutilização de checkout antigo após alteração privilegiada fora do fluxo.

## R. Pix preservado

Chave específica ou da agência, QR Code, copiar chave, valor, Já fiz o pagamento, `reportInvoicePayment` e confirmação administrativa preservados. Gestão não liquida faturas nem muda meios de pagamento como efeito colateral. Regressões de UI, service, report/confirm concorrentes e liquidação idempotente passaram.

## S. Lembretes preservados

Nenhuma alteração no scheduler nesta missão. Régua de -3, 0, +1, +7, +9 e +10 dias, sendo +10 somente Admin; nenhuma suspensão automática. Rotina relê a fatura e usa vencimento atual. Teste específico edita o vencimento, comprova ausência no dia antigo e envio no novo, além de ausência para paga/cancelada/excluída. Regressões cobrem todos os estágios, concorrência, idempotência e paginação.

## T. Rules e índices

`firestore.rules`: criação administrativa somente `pending`; atualização direta limitada à revisão de promessa existente (`paymentPromise`, `promisedPaymentDate`, `updatedAt`); edição financeira/status e exclusão física apenas backend. Delete direto negado também ao Admin no navegador. `invoice_management_operations`: leitura somente Admin, nenhuma escrita de browser. Histórico e isolamento de marcas preservados.

Nenhuma alteração em `firestore.indexes.json` ou `storage.rules`. Novas buscas usam igualdade por campo único (`recurrenceGroupId`, `entityId`, `invoiceId`) e leitura por ID. Banco nomeado preservado: `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58` no projeto `gen-lang-client-0975642231`. Emuladores usam exclusivamente projeto demo. Testes de Rules aprovam criação pending/revisão de promessa e negam bypass administrativo, Cliente e Equipe.

## U. Functions

Nova: `manageInvoiceDocuments`, callable v2, região `southamerica-east1`, timeout 120 segundos, sem secrets. Transporte público para protocolo callable/browser; Firebase Auth válido, usuário não desativado/sessão não revogada e documento Admin ativo são obrigatórios antes das operações. Import de gestão é lazy. Implementação em `invoice-management.ts`.

Nenhuma nova modificação funcional em checkout, webhook, reconciliação, report/confirm ou scheduler nesta missão. O diff acumulado de `invoice-billing.ts` é da integração anterior. Publicação futura precisa incluir a nova callable, Rules e frontend de forma coordenada. Publicar Rules antes de migrar a UI antiga bloqueará temporariamente suas edições diretas. Não usar deploy geral incluindo `payments`.

## V. Testes e resultados

| Grupo | Resultado final |
| --- | --- |
| Frontend relacionado, 15 arquivos | 76 testes distintos aprovados |
| Backend unitário/contratos | 57 aprovados, 0 falhas, 0 skipped |
| Integração backend em Firestore local | 57 aprovados |
| Rules Firestore/Storage | 25 aprovados |
| Integração + Rules, mesma rodada final | 82 aprovados, 0 falhas, 0 skipped |

Total: **215 testes distintos aprovados**. Frontend foi validado em uma rodada de 74/74 nos 15 arquivos (76,54 s), seguida da atualização somente de `invoice-billing-flow.test.tsx`: 5/5 (56,42 s), incluindo dois casos novos. Os outros 71 não foram alterados nem repetidos desnecessariamente. Não somar novamente os três casos repetidos. Rodada backend final: 18,926 s de testes; integração/Rules final: 51,285 s de testes, além da inicialização dos emuladores. A rodada anterior de 81/81 foi superada por 82/82 após acrescentar o cenário de lembretes.

A integração inclui 20 casos de gestão, 12 de cobrança/lembretes, oito de checkout Etapa 1 e 17 de liquidação/webhook/reconciliação Etapa 2. Não foi executada a suíte frontend inteira fora do escopo financeiro.

Frontend relacionado: `invoice-filters`, `invoice-management-dialog`, `finance-view`, `invoice-service`, `invoice-billing-flow`, `invoice-domain`, `invoice-dialogs`, `invoice-repository`, `invoice-payment-options`, `invoice-checkout`, `invoice-checkout-button`, `invoice-billing-functions`, `agency-payment-settings`, `notifications`, `payment-feature-flag`.

Comandos executados: `npm.cmd run test:run --` seguido dos 15 arquivos acima em `src/test/`; complemento final `npm.cmd run test:run -- src/test/invoice-billing-flow.test.tsx`; `npm.cmd --prefix functions run test`; `firebase.cmd emulators:exec --only firestore,storage --project demo-ts-agency-rules "node --test test/rules/*.test.mjs"`.

Testes novos: sete filtros; quatro diálogo/preview; dois filtros Admin/Cliente; vinte integração de gestão; um cenário de Rules. Cobrem autorização, entradas inválidas, edição de todos os campos, proteção de pagas/informadas/externas, history/boleto/notificações, prévia sem alterações, expiração/autor/replay, recálculo, grupos e anteriores intactos, clamp, encurtamento, limpeza desde 2024, limites, versões, transições e lembretes após edição.

## W. TypeScript, builds, discovery e diff

- **SUCESSO:** `npx.cmd tsc --noEmit`, execução final, código 0.
- **SUCESSO:** `npm.cmd run build`, 3.805 módulos, 44,31 s. Resultado preservado: não houve alteração de produção frontend depois dele, somente testes e documentação.
- **SUCESSO:** build Functions `npm.cmd --prefix functions run build`; também repetido automaticamente pelo `npm.cmd --prefix functions run test` final, código 0.
- **SUCESSO:** `node functions/scripts/check-discovery.mjs` final: 21 endpoints, 3.667 ms, limite 10.000 ms; sem novos secrets globais.
- **SUCESSO:** `git diff --check`, código 0.
- **SUCESSO:** `git diff --stat`: 20 arquivos rastreados, 217 inserções e 61 exclusões. Não inclui arquivos não rastreados, incluindo este relatório.
- **SUCESSO:** `git diff --name-only -- payments` e `git diff --cached --stat` vazios.
- **WARNING:** somente os avisos descritos em X. Nenhum erro novo remanescente nas validações.

## X. Warnings e intercorrências

Build frontend: warning de chunk principal acima de 500 kB (865,81 kB minificado nesta execução), preexistente nas etapas anteriores; chunks lazy de páginas/Financeiro continuam gerados. Não é falha de build.

Emuladores: aviso Java `sun.misc.Unsafe`, teste negativo de Storage com `category` ausente e `PERMISSION_DENIED` esperados ao validar bloqueios. Git: avisos LF → CRLF. Nenhum desses avisos corresponde a uma concessão de acesso ou teste ignorado.

Sandbox impediu inicialmente leitura de configuração do Vite/Firebase CLI; execuções foram repetidas com permissão apropriada, sem publicação. A primeira checagem TypeScript encontrou uso incorreto de `getTime` em Timestamp e foi corrigida. Um teste inicial tinha expectativa de empate de datas incorreta; fixture ajustada para distinguir os dias e revalidada. Não permanecem esses erros. Nenhum problema preexistente de código foi usado para justificar teste falhando.

## Y. Antes da homologação/publicação

Entrega local validada; homologação visual/manual com contas Admin/Cliente e dados representativos ainda deve ocorrer após autorização e publicação coordenada da callable, frontend e Rules. Validar fluxos mobile/desktop, prévia e mensagens com dados reais sem executar limpeza de produção sem conferência. Limites de 60 parcelas/450 gravações são deliberados e devem ser respeitados; séries legadas fora disso exigem revisão especializada. Não houve auditoria de dados remotos nesta missão.

Mercado Pago continua sem homologação externa. Ainda faltam, em missão autorizada separada: ambiente/contas de teste apropriados; configuração futura dos secrets e permissões, recebedor e modo explícitos; webhook assinado na aplicação correta; validação real payment → merchant_order → preference, valores, assinatura, retorno, duplicidade e retentativas; observabilidade de `retryable`/`requiresReview`; processo operacional de reconciliação e retenção; análise de reembolsos/chargebacks e limites de busca/replay. Não apagar locks para liberar preferências. Manter checkout desativado até homologação e autorização explícita. Nenhuma credencial foi solicitada/configurada.

Nenhum deploy, staging, commit ou push realizado. `payments/` e `cors.json` preservados. O outro workspace proibido não foi acessado. Aguardar autorização antes de qualquer publicação.

## Z. Git status final

Estado acumulado: **20 arquivos rastreados modificados e 30 não rastreados**, incluindo este relatório e o `cors.json` preexistente. Nenhum arquivo staged. Não representa somente esta missão: também contém as Etapas 1 e 2 preservadas.

```text
 M firestore.rules
 M functions/scripts/check-discovery.mjs
 M functions/src/index.ts
 M functions/src/invoice-billing.ts
 M src/components/Admin/AgencySettings.tsx
 M src/components/FinanceView.tsx
 M src/components/finance/InvoiceDialog.tsx
 M src/components/finance/InvoiceHistoryView.tsx
 M src/components/finance/InvoicePaymentOptions.tsx
 M src/config/features.ts
 M src/invoices/invoice-domain.ts
 M src/invoices/payment-settings.ts
 M src/services/invoices.service.ts
 M src/test/agency-payment-settings.test.tsx
 M src/test/finance-view.test.tsx
 M src/test/invoice-billing-flow.test.tsx
 M src/test/invoice-payment-options.test.tsx
 M src/test/invoice-service.test.ts
 M src/types.ts
 M test/rules/payments.rules.test.mjs
?? cors.json
?? docs/FINANCEIRO-GESTAO-FATURAS-RELATORIO.md
?? docs/MERCADO-PAGO-ETAPA-1-RELATORIO.md
?? docs/MERCADO-PAGO-ETAPA-2-RELATORIO.md
?? functions/src/checkout-payment-processing.ts
?? functions/src/checkout-payment-provider.ts
?? functions/src/checkout-webhook-auth.ts
?? functions/src/checkout-webhook.ts
?? functions/src/invoice-checkout-domain.ts
?? functions/src/invoice-checkout.ts
?? functions/src/invoice-management.ts
?? functions/src/invoice-settlement.ts
?? functions/src/mercado-pago-checkout.ts
?? functions/src/test/checkout-webhook.test.ts
?? functions/src/test/invoice-checkout.test.ts
?? src/components/finance/InvoiceManagementDialog.tsx
?? src/data/functions/invoice-checkout.functions.ts
?? src/data/functions/invoice-management.functions.ts
?? src/hooks/useInvoiceCheckout.ts
?? src/hooks/useInvoiceManagement.ts
?? src/invoices/invoice-filters.ts
?? src/services/invoice-checkout.service.ts
?? src/services/invoice-management.service.ts
?? src/test/invoice-checkout-button.test.tsx
?? src/test/invoice-checkout.test.tsx
?? src/test/invoice-filters.test.ts
?? src/test/invoice-management-dialog.test.tsx
?? test/rules/checkout-settlement.test.mjs
?? test/rules/invoice-checkout.test.mjs
?? test/rules/invoice-management.test.mjs
```
