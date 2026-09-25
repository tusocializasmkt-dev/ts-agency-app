# Bloco Financeiro Final — relatório de implementação

Data: 25/09/2026. Implementação local concluída e validada; publicação não executada.

Workspace exclusivo: `C:\Users\samsung\OneDrive\Desktop\ts-agency-app`.

Projeto Firebase previsto: `gen-lang-client-0975642231`. Banco: `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58`. Região das Functions: `southamerica-east1`. Projeto Vercel: `ts-agency-app`.

O outro workspace proibido não foi acessado. A única alteração local anterior encontrada era `?? cors.json`; ela foi preservada e não pertence a este bloco. Não foram consultados ou alterados dados de produção.

## 1. Financeiro encontrado

Já existiam faturas em `invoices`, histórico em `invoices/{id}/history`, criação mensal recorrente com IDs independentes e `recurrenceGroupId`, edição, boleto, Pix por fatura ou configuração da agência, suspensão/cancelamento de cobrança, promessa de pagamento e confirmação manual.

O caminho existente era FinanceView → useInvoices → invoices.service → invoices.repository → Firestore. O portal do cliente já restringia as consultas à própria marca. As rotas, as Rules e as projeções operacionais já impediam acesso financeiro da equipe. A administração de acesso dos clientes já era separada do status comercial.

A confirmação anterior gravava o pagamento e tentava notificar separadamente; a notificação poderia falhar sem desfazer a confirmação. O botão e o método `markPaid` foram reaproveitados, agora com gravação atômica no backend. Criação, recorrência, boleto, promessa e administração de acessos foram preservados.

## 2. Inventário do Mercado Pago anterior

Inspeção do código local, não uma auditoria de recursos remotos publicados.

| Classificação | Encontrado e tratamento |
| --- | --- |
| Ainda utilizado | `requestPaymentPromise`, chamado pelo Financeiro atual. É uma promessa administrativa, não pagamento bancário. Preservado. Tipos, mappers e leitores de pagamentos legados também foram preservados. |
| Implementado, mas inativo na interface | `ClientPaymentPage`, `usePaymentCheckout`, `PixPaymentView`, serviço de criação de Pix, provider Orders/Payments, reconciliação e webhook. `FEATURES.automatedPayments` permanece `false`; a rota antiga redireciona ao Financeiro. |
| Incompleto para uso atual em produção | Fluxo automático exige secrets, ambiente e configuração externa. O provider exige `PAYMENT_ENVIRONMENT=sandbox`. Intenções aceitam tipos como cartão/boleto, mas não representam checkout de cartão concluído. Nada disso foi validado com banco/provedor ou reativado. |
| Sem consumidor ativo identificado na UI | Export `createPaymentIntent` no serviço frontend, contratos/resultados de cartão e boleto e referências legadas. São candidatos a revisão futura, não motivo para exclusão nesta missão. A ausência de chamada na UI não prova ausência de consumidor externo de uma Function. |
| Functions declaradas no codebase `payments` | `createPaymentIntent`, `requestPaymentPromise`, `createPixPayment`, `reconcilePayment`, `mercadoPagoWebhook`. Nenhuma alterada ou selecionada para publicação deste bloco. |
| Secrets referenciados | `MERCADO_PAGO_ACCESS_TOKEN`, `MERCADO_PAGO_ORDERS_ACCESS_TOKEN`, `MERCADO_PAGO_WEBHOOK_SECRET`, `MERCADO_PAGO_ORDERS_WEBHOOK_SECRET`. O secret de webhook legado é declarado, mas o handler atual usa o secret Orders. Nenhum valor foi solicitado, exposto ou alterado. |
| Firestore legado | Coleção `payments`, subcoleções `attempts`/`events`, `payment_idempotency`, `payment_active_pix`, `payment_rate_limits`, `payment_webhook_events`; modelo `payment_provider_config`. Nas faturas: `activePaymentId`, `paymentProvider`, `paymentMethodPreference`, `externalReference` e campos Pix/boleto. Preservados. |
| UI nova | Usa somente chave/QR configurados e link externo. Não chama `createPixPayment`, `createPaymentIntent` ou reconciliação. |

Recomendação futura: verificar consumidores e recursos publicados antes de remover contratos ou wrappers sem uso, revisar a referência de webhook legado e decidir formalmente se o checkout automático será mantido. Não remover `requestPaymentPromise` junto com uma eventual limpeza bancária. A flag frontend desliga a UI; ela não despublica nem desativa Functions que eventualmente já existam remotamente.

## 3. Arquitetura implementada

- Leitura de faturas/histórico e configuração continua nos hooks/services/repositories existentes.
- Configuração: AgencySettings → useAgencyConfig → agency-config.service (validação) → repository existente → `agency_config/default`.
- Informação/confirmação: FinanceView → useInvoices → invoices.service → `invoice-billing.functions` → SDK `httpsCallable` compartilhado → Functions autenticadas → transação Firestore.
- Lembretes: Scheduled Function → serviço backend `invoice-billing` → consultas paginadas → transação de histórico e notificações.
- Notificações continuam em `notifications`, usando o centro de notificações, contador, leitura e navegação existentes. São avisos internos, não e-mails, push ou WhatsApp automáticos.

O backend carrega o módulo novo apenas dentro dos handlers, preservando inicialização adiada e discovery. As novas Functions não declaram secrets bancários ou OpenAI.

## 4. Modelo e compatibilidade

Em `agency_config/default`, foram reutilizados `pixKey` e `pixKeyType`, acrescentando somente `pixQrCodeUrl` e `mercadopagoPaymentLink`. Não foi criado um segundo objeto de configuração com os mesmos dados. Tudo é opcional.

Em `invoices/{id}`:

- Novo status `payment_reported`.
- `paymentReportedAt`, `paymentReportedBy`, `paymentReportCount` na informação do pagamento.
- `confirmedBy`, além de `paidAt` já existente, na confirmação.
- `updatedAt` e `updatedBy` continuam registrando a alteração.

Histórico ganha `payment_reported`, `payment_confirmed` e os seis eventos da régua. Rótulos antigos, inclusive `marked_paid`, continuam reconhecidos. Faturas antigas sem os novos campos continuam funcionando, sem migração em massa.

O valor permanece em reais no modelo existente. Nenhum pagamento altera outras parcelas do mesmo grupo. O resumo em aberto inclui `payment_reported`, sem classificá-lo como cobrança vencida pendente de aviso.

## 5. Fluxo Pix

A agência configura chave, tipo e URL HTTPS da imagem de um QR válido em Configurações → Pagamentos. Não existe geração dinâmica de QR ou integração Nubank.

A fatura exibe chave, QR e “Copiar Pix”. O botão usa o helper de clipboard existente, copia somente a chave e apresenta “Pix copiado!” ou orientação em caso de falha. Mantém suporte ao fallback já existente para navegadores sem Clipboard API.

A chave específica de uma fatura antiga tem prioridade. Se for diferente da chave da agência, o QR global não é exibido, evitando combinar dados de contas diferentes. QR com falha de carregamento é ocultado. Sem configuração, não se oferece um Pix quebrado.

## 6. Fluxo cartão

O Admin configura um link HTTPS de pagamento em `mercadopago.com.br`/subdomínios ou `mpago.la`. Validação rejeita HTTP, credenciais embutidas, portas alternativas, domínios imitadores e URL raiz sem caminho. URLs inválidas também são filtradas antes da exibição ao cliente.

“Pagar com cartão” abre nova aba com `noopener noreferrer`. O TS Agency não coleta número, validade ou CVV e não confirma pagamento pelo simples clique. A agência deve conferir que o destino aceita cartão, pertence à conta correta e permite o valor correspondente à fatura. O link global e o QR não recebem valor dinâmico da fatura. A interface orienta a conferir destinatário e valor.

## 7. “Já fiz o pagamento”

Após confirmação no modal, a callable aceita apenas `invoiceId`. UID vem do Firebase Auth. O backend verifica sessão válida/não revogada, usuário não desativado, perfil de cliente, marca com acesso e propriedade da fatura. Admin/equipe não se passam por cliente informando uma role no payload.

Somente `pending`/`overdue` passam para `payment_reported`. Na mesma transação são gravados data, ator, histórico e notificação para os administradores ativos. Repetir a chamada nesse estado retorna o mesmo estado, sem duplicar eventos. Não há `paidAt` nem quitação nessa operação.

A UI passa a mostrar “Pagamento informado. Aguardando confirmação.” e esconde meios/ação de novo pagamento para evitar repetição. Enquanto isso, todos os lembretes automáticos ficam pausados.

## 8. Confirmação administrativa e permissões

O Admin usa o mesmo fluxo de marcar pago; em fatura informada, o botão diz “Confirmar pagamento”. A callable revalida `admins/{uid}` ativo e autenticação, grava `paid`, `paidAt`, `confirmedBy`, histórico e notificação ao cliente na mesma transação. Faturas pendentes antigas continuam podendo ser confirmadas diretamente.

A mensagem ao cliente inclui descrição/identificação da fatura, valor e vencimento. Confirmar novamente uma fatura paga não cria nova notificação.

| Perfil | Permissão final |
| --- | --- |
| Cliente ativo | Ler faturas próprias e meios; copiar Pix; abrir link; informar pagamento próprio. Não confirma, altera valor/vencimento/configuração ou acessa outra marca. |
| Admin ativo | Gestão financeira existente, meios de pagamento e confirmação. Suspensão de acesso continua exclusivamente manual pelo mecanismo existente. |
| Manager / Social Media | Sem Financeiro, configuração de cobrança ou chamadas administrativas. Isolamento de marcas e trabalho operacional preservados. |

O transporte público das duas callables é necessário para o SDK no navegador; não dispensa Firebase Auth nem as validações de perfil/propriedade dentro dos handlers. A Scheduled Function não é uma operação disponível ao cliente.

## 9. Régua automática

Execução diária às **09:00, America/Sao_Paulo**. Usa a data civil do horário agendado, inclusive em retries.

| Etapa | Destinatário | Evento / conteúdo |
| --- | --- | --- |
| 3 dias antes | Cliente | `reminder_due_3_days`: vence em 3 dias |
| Vencimento | Cliente | `reminder_due_today`: vence hoje |
| 1 dia depois | Cliente | `reminder_overdue_1_day`: fatura em atraso |
| 7 dias depois | Cliente | `reminder_overdue_7_days`: regularização evita possíveis restrições, sempre avaliadas pela agência |
| 9 dias depois | Cliente | `reminder_overdue_9_days`: pendência precisa de atenção |
| 10 dias depois | Admins ativos | `admin_overdue_10_days`: cliente, valor, vencimento, 10 dias e avaliação manual |

Cada aviso inclui contexto e link ao Financeiro correspondente. `entityId`/`brandId` identificam a fatura; a navegação reaproveita a página Financeiro, sem criar nova rota por fatura.

Somente `pending`/`overdue` são consultados. `paid`, `payment_reported`, `suspended` e `cancelled` não recebem avisos. O estado é conferido novamente na transação, evitando confiar em uma consulta antiga.

## 10. Idempotência e consultas

Histórico serve também de marcador atômico:

- Informação: `payment_reported_N`, com contador na fatura. Cliques concorrentes no mesmo estado geram um evento. Se a cobrança for suspensa e retomada manualmente, uma nova informação legítima pode receber outro contador.
- Confirmação: `payment_confirmed`; o estado pago encerra a operação nas repetições.
- Régua: `ETAPA_YYYY-MM-DD`, vinculada ao vencimento. Reexecutar não reenvia. Alterar o vencimento permite avisos relativos à nova data; voltar à data anterior não repete avisos já registrados.
- Notificações têm IDs determinísticos derivados de fatura, evento e destinatário, sem dados sensíveis no ID.

Se a transação falhar, status, histórico e notificações não são parcialmente confirmados. Concorrência real foi testada no emulador, incluindo confirmação simultânea a lembrete.

O job consulta seis datas exatas e dois status, em páginas de 100 documentos. Não percorre todas as faturas. Contas administrativas são lidas quando é preciso notificá-las; não é feita varredura de clientes. Existe limite defensivo de 450 destinatários administrativos por transação, com erro explícito em vez de truncamento silencioso.

## 11. Comportamento aos 10 dias

Somente histórico e notificação para Admins ativos. Não altera a marca, `accessEnabled`, status comercial, custom claims ou Authentication. Não foi criado `financialSuspended`.

O Admin decide manualmente se usa a administração de acessos já existente. Suspender uma cobrança continua sendo diferente de suspender o login do cliente.

## 12. Functions

Criadas no codebase **default**, com código em `functions/`:

1. `reportInvoicePayment`: callable autenticada do cliente.
2. `confirmInvoicePayment`: callable autenticada exclusiva do Admin.
3. `sendInvoiceReminders`: agendada diária, até três retries, timeout de 540 segundos.

O módulo comum usa o mesmo `getAdminServices()` e banco nomeado do projeto. Nenhuma Function antiga teve o handler funcional alterado. `marketingAssistant` e todo o codebase `payments` ficaram intactos. O verificador de discovery foi atualizado para as 17 exportações.

## 13. Rules

Única alteração em `firestore.rules`: aceitar `payment_reported` no modelo válido de fatura para que o Admin continue podendo editá-la.

Nenhuma permissão de gravação de fatura foi concedida ao cliente. Informação e confirmação passam pelo backend. Novos avisos são criados pelo Admin SDK; não foi ampliada a lista de notificações que o frontend pode fabricar. Leitura e marcação como lida seguem as regras existentes.

`storage.rules` não foi alterado. A configuração do QR usa URL, sem introduzir novo upload ou novas permissões Storage.

## 14. Índice

Acrescentado um índice mínimo de coleção `invoices`: `status ASCENDING` + `dueDate ASCENDING` (ordenação por ID implícita). Dá suporte à seleção de status/data e paginação do job. Nenhum índice existente foi removido.

O arquivo `firebase.json` já associa Rules e índices ao banco nomeado correto e permaneceu inalterado. Emulador não substitui a verificação do índice pronto no ambiente real.

## 15. Arquivos deste bloco

Todos os caminhos abaixo são relativos exclusivamente a `C:\Users\samsung\OneDrive\Desktop\ts-agency-app`.

| Grupo | Arquivos |
| --- | --- |
| Backend/configuração alterados | [functions/src/index.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/src/index.ts); [functions/scripts/check-discovery.mjs](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/scripts/check-discovery.mjs); [firestore.rules](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/firestore.rules); [firestore.indexes.json](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/firestore.indexes.json) |
| Backend novo | [functions/src/invoice-billing.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/src/invoice-billing.ts); [functions/src/test/invoice-billing.test.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/src/test/invoice-billing.test.ts) |
| Frontend alterado | [src/types.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/types.ts); [src/components/Admin/AgencySettings.tsx](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/Admin/AgencySettings.tsx); [src/components/FinanceView.tsx](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/FinanceView.tsx); [src/components/finance/InvoiceHistoryView.tsx](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/finance/InvoiceHistoryView.tsx); [src/hooks/useInvoices.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/hooks/useInvoices.ts); [src/invoices/invoice-domain.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/invoices/invoice-domain.ts); [src/services/agency-config.service.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/services/agency-config.service.ts); [src/services/invoices.service.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/services/invoices.service.ts); [src/services/notifications.service.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/services/notifications.service.ts) |
| Frontend novo | [src/components/finance/InvoicePaymentOptions.tsx](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/finance/InvoicePaymentOptions.tsx); [src/data/functions/invoice-billing.functions.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/data/functions/invoice-billing.functions.ts); [src/invoices/payment-settings.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/invoices/payment-settings.ts) |
| Testes alterados | [src/test/invoice-service.test.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/invoice-service.test.ts); [test/rules/payments.rules.test.mjs](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/test/rules/payments.rules.test.mjs) |
| Testes novos | [src/test/agency-payment-settings.test.tsx](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/agency-payment-settings.test.tsx); [src/test/invoice-payment-options.test.tsx](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/invoice-payment-options.test.tsx); [src/test/invoice-billing-flow.test.tsx](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/invoice-billing-flow.test.tsx); [src/test/invoice-billing-functions.test.ts](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/invoice-billing-functions.test.ts); [test/rules/invoice-billing.test.mjs](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/test/rules/invoice-billing.test.mjs) |
| Relatório novo | [docs/BLOCO-FINANCEIRO-FINAL-RELATORIO.md](C:/Users/samsung/OneDrive/Desktop/ts-agency-app/docs/BLOCO-FINANCEIRO-FINAL-RELATORIO.md) |

Nenhum arquivo de Feed, viewer, download, CORS, OpenAI, provider Mercado Pago ou administração de acessos foi alterado. `cors.json` continua apenas como arquivo anterior não rastreado.

## 16. Testes executados

Resultados finais dos conjuntos direcionados:

| Conjunto | Resultado |
| --- | --- |
| Frontend: 12 arquivos (faturas, meios, configuração, histórico de regressões de logo, notificações, rotas/equipe) | 77 testes aprovados |
| Frontend: ligação FinanceView → confirmação e contrato das novas callables, 2 arquivos | 4 testes aprovados |
| Backend unitário: datas São Paulo/virada de mês, payload, sessão revogada/desativada | 3 testes aprovados |
| Backend com transações reais no Firestore Emulator, banco nomeado | 12 testes aprovados |
| Rules Firestore/Storage e permissões novas/existentes | 22 testes aprovados |

**Total: 118 testes aprovados nos conjuntos executados; nenhuma falha pendente, nenhum teste ignorado nesses conjuntos.** Não foi executada a suíte inteira do frontend.

Os 12 testes de transações cobrem concorrência de cliques, destinatários, confirmação, cliente de outra marca, equipe, admin inativo, cliente desativado, as seis etapas, exclusão de pagos/informados/suspensos/cancelados, invariância da marca, recorrência independente, corrida confirmação/lembrete e paginação de 103 faturas. Usaram somente o projeto fictício `demo-ts-agency-rules`; nenhum documento real.

Ocorrências de validação resolvidas: o sandbox impediu esbuild/Firebase CLI inicialmente; os comandos locais foram repetidos com autorização de execução apropriada. Foi corrigido o import do novo teste do emulador. A comparação temporal de concorrência passou a usar `DocumentSnapshot.createTime`, que representa a versão gravada, em vez do campo `serverTimestamp` de request. O teste de concorrência passou. As 22 verificações de Rules passaram nos dois ciclos em que foram executadas.

Os emuladores emitiram avisos de Java/Storage e mensagens `PERMISSION_DENIED` esperadas pelos testes negativos; não houve falha final de Rules. Referência técnica: [isolamento de transações](https://firebase.google.com/docs/firestore/transaction-data-contention) e [semântica REQUEST_TIME](https://firebase.google.com/docs/firestore/reference/rpc/google.firestore.v1).

Comandos de validação usados:

```powershell
npm.cmd run test:run -- src/test/invoice-payment-options.test.tsx src/test/agency-payment-settings.test.tsx src/test/invoice-service.test.ts src/test/invoice-domain.test.ts src/test/invoice-repository.test.ts src/test/finance-view.test.tsx src/test/agency-settings-logo.test.tsx src/test/invoice-dialogs.test.tsx src/test/notifications.test.tsx src/test/notification-mapper.test.ts src/test/sidebar-team-access.test.tsx src/test/router.test.tsx
npm.cmd run test:run -- src/test/invoice-billing-flow.test.tsx src/test/invoice-billing-functions.test.ts
npm.cmd --prefix functions run build
node --test functions/lib/test/invoice-billing.test.js
firebase.cmd emulators:exec --only firestore,storage --project demo-ts-agency-rules "node --test test/rules/*.test.mjs"
firebase.cmd emulators:exec --only firestore --project demo-ts-agency-rules "node --test test/rules/invoice-billing.test.mjs"
node functions/scripts/check-discovery.mjs
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
git diff --stat
git status --short
```

O último comando de emulador somente Firestore validou os 12 testes de transações após o ajuste no teste temporal; as Rules já estavam aprovadas e não foram modificadas depois.

## 17. TypeScript, builds e discovery

- Frontend `tsc --noEmit`: sucesso, inclusive após os dois últimos arquivos de teste.
- Frontend build: sucesso. Aviso de bundle maior que 500 kB continua; otimização de módulos alheios ao escopo não foi feita.
- Functions build: sucesso.
- Discovery local: HTTP 200; 17 endpoints; 8.806 ms, abaixo do limite de 10.000 ms do verificador. Nenhum secret global novo; somente `marketingAssistant` mantém sua referência própria anterior. O tempo depende da máquina.
- Os chunks de rotas continuam separados no build; carregamento adiado foi preservado.

## 18. Git diff --check

Passou sem erros de whitespace. Avisos locais de conversão LF/CRLF não são falhas de validação. O diff foi revisado dentro do escopo e nenhuma alteração anterior foi descartada.

`git diff --stat` dos arquivos já rastreados: **15 arquivos, 112 inserções e 36 exclusões**. Esse comando não inclui os arquivos novos ainda não rastreados; eles estão listados acima e no status abaixo. Nada foi adicionado ao stage.

## 19. Git status --short

```text
 M firestore.indexes.json
 M firestore.rules
 M functions/scripts/check-discovery.mjs
 M functions/src/index.ts
 M src/components/Admin/AgencySettings.tsx
 M src/components/FinanceView.tsx
 M src/components/finance/InvoiceHistoryView.tsx
 M src/hooks/useInvoices.ts
 M src/invoices/invoice-domain.ts
 M src/services/agency-config.service.ts
 M src/services/invoices.service.ts
 M src/services/notifications.service.ts
 M src/test/invoice-service.test.ts
 M src/types.ts
 M test/rules/payments.rules.test.mjs
?? cors.json
?? docs/BLOCO-FINANCEIRO-FINAL-RELATORIO.md
?? functions/src/invoice-billing.ts
?? functions/src/test/invoice-billing.test.ts
?? src/components/finance/InvoicePaymentOptions.tsx
?? src/data/functions/invoice-billing.functions.ts
?? src/invoices/payment-settings.ts
?? src/test/agency-payment-settings.test.tsx
?? src/test/invoice-billing-flow.test.tsx
?? src/test/invoice-billing-functions.test.ts
?? src/test/invoice-payment-options.test.tsx
?? test/rules/invoice-billing.test.mjs
```

## 20. Limitações e testes manuais necessários

- Conferir QR com aplicativo bancário real, titular, chave e valor. Validação de URL não autentica o beneficiário nem o conteúdo bancário da imagem.
- Abrir o link Mercado Pago em desktop/mobile, confirmar estabelecimento, valor e disponibilidade de cartão. Um link global com valor fixo não serve automaticamente para faturas de valores diferentes. Usar configuração adequada antes de disponibilizá-lo.
- Testar com Admin e dois clientes reais após publicação: informação, notificação, confirmação e bloqueio de operações cruzadas. Testar copiar Pix em Safari/iOS e Android.
- Verificar permissões de invocação das novas callables e do Scheduler, APIs necessárias e índice pronto. Nenhum IAM ou recurso remoto foi inspecionado/alterado nesta missão.
- Scheduled Functions usam Cloud Scheduler, sujeito a APIs, permissões, billing e custos da plataforma. Confirmar pré-requisitos antes de publicar; nada foi habilitado aqui. [Documentação oficial](https://firebase.google.com/docs/functions/schedule-functions).
- A primeira execução às 09:00 considera faturas existentes que estejam exatamente numa das seis etapas; revisar as cobranças antes de ativar o job. Não há disparo retroativo geral de etapas anteriores nem recuperação automática de dias inteiros perdidos além dos retries do evento agendado.
- O job tem timeout finito e paginação; acompanhar duração/falhas ao crescer a base. Ausência de Admin ativo impede informação de pagamento/alerta administrativo em vez de confirmar uma operação sem destinatário. Dados legados malformados precisam de revisão administrativa.
- `payment_reported` pausa **todos** os lembretes, por tempo indeterminado até decisão do Admin. É necessário acompanhar essa fila. Suspensão/retomada de cobrança continua disponível; não se criou rejeição financeira ou bloqueio de login automático.
- Os avisos abrem a página Financeiro existente; se houver filtro de marca/status ativo, o Admin pode precisar selecionar a marca citada na mensagem.
- O bloco não comprova o estado remoto da integração antiga. Manter a flag desabilitada e não publicar/ativar `payments` nesta sequência.

## 21. Configuração manual pendente

Em Configurações → Pagamentos: chave Pix verdadeira, tipo, URL HTTPS estável de QR válido e link de pagamento Mercado Pago adequado. Nada foi inventado ou preenchido com dados bancários fictícios no app. Não são necessários tokens bancários ou secrets para este fluxo.

Revisar faturas abertas e seus vencimentos/valores, destinatários administrativos ativos e acesso dos clientes. As faturas precisam manter `brandId` correspondente ao UID do cliente, como no modelo atual. Não há script de migração obrigatório nem necessidade de criar banco `(default)`.

## 22. Componentes a publicar

| Componente | Necessário? |
| --- | --- |
| Frontend / Vercel `ts-agency-app` | Sim |
| Functions codebase default | Somente `reportInvoicePayment`, `confirmInvoicePayment`, `sendInvoiceReminders` |
| Functions antigas / codebase payments / marketingAssistant | Não |
| Firestore Rules | Sim, no banco nomeado |
| Firestore índices | Sim, um índice novo no banco nomeado |
| Storage Rules / CORS | Não |
| Secrets / Authentication / dados de marcas | Nenhuma alteração remota automática necessária por este bloco |

## 23. Sequência mínima de publicação — NÃO EXECUTADA

Executar manualmente somente após autorização, em PowerShell no workspace correto. Validar cada etapa antes da seguinte. Verificar conta/projeto e pré-requisitos do Scheduler; não habilitar billing ou APIs por suposição. Não aceitar exclusões de índices remotos alheios ao bloco se o CLI propuser alguma.

**Preparação local:**

```powershell
Set-Location -LiteralPath 'C:\Users\samsung\OneDrive\Desktop\ts-agency-app'
npm.cmd --prefix functions run build
npx.cmd tsc --noEmit
npm.cmd run build
git diff --check
```

**Firebase — índice primeiro:**

```powershell
firebase.cmd deploy --project gen-lang-client-0975642231 --only "firestore:indexes"
```

Aguardar o novo índice ficar pronto no banco `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58`. O filtro acima usa a configuração nomeada já existente no `firebase.json`, sem criar `(default)`.

**Rules e operações interativas:**

```powershell
firebase.cmd deploy --project gen-lang-client-0975642231 --only "firestore:rules"
firebase.cmd deploy --project gen-lang-client-0975642231 --only "functions:default:reportInvoicePayment,functions:default:confirmInvoicePayment"
```

Seletores qualificados evitam incluir `payments` e `marketingAssistant`. Não usar `--only functions` genérico. As Functions não dependem dos secrets antigos.

**Frontend/Vercel:** publicar a versão revisada no projeto `ts-agency-app`, usando o fluxo Git/Vercel da agência ou, se autorizado a publicar diretamente o workspace:

```powershell
npx.cmd vercel link --project ts-agency-app
npx.cmd vercel --prod
```

Confirmar a conta/equipe correta no vínculo. Não publicar no antigo projeto `ts-app`. Nenhum comando Git de stage/commit/push faz parte desta execução; revisão e versionamento ficam para autorização posterior.

Configurar os meios reais, testar informação/confirmação e verificar notificações antes de ativar a régua. Então:

```powershell
firebase.cmd deploy --project gen-lang-client-0975642231 --only "functions:default:sendInvoiceReminders"
```

Essa ordem evita avisos automáticos antes de conferir dados, permissões e interface. Verificar o job criado, horário São Paulo e primeira execução. Não executar cobranças reais apenas para testar sem decisão da agência.

**Confirmações finais:** nenhum cliente foi bloqueado automaticamente; nenhuma credencial bancária foi armazenada; nenhum dado de cartão foi coletado pelo TS Agency; nenhuma integração Nubank foi criada; nenhuma integração automática antiga do Mercado Pago foi reativada; nenhum deploy, git add, commit ou push foi realizado. Publicação permanece pendente de autorização.
