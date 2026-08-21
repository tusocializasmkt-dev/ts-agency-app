# Consolidação da codebase de pagamentos

## Arquitetura anterior

O `firebase.json` já declarava as codebases `default` (`functions/`, Node.js 22) e `payments` (`payments/`). Entretanto, `payments/src/index.ts` ainda continha somente o template do Firebase, enquanto todo o backend financeiro estava em `functions/src`. Os artefatos compilados correspondentes permaneciam em `functions/lib`.

## Arquitetura atual

`payments/` é a única fonte do backend financeiro. Ela exporta, na região `southamerica-east1`, os mesmos contratos públicos existentes: `createPaymentIntent`, `requestPaymentPromise`, `createPixPayment`, `reconcilePayment` e `mercadoPagoWebhook`.

`functions/` permanece como codebase `default` e ponto reservado às funcionalidades não financeiras. Como o inventário atual não encontrou Functions não financeiras nessa pasta, seu `index.ts` não exporta handlers. Isso evita manter cópias funcionais do domínio financeiro.

## Responsabilidades

### Codebase `default`

- receber futuras Functions não financeiras;
- não exportar pagamentos, Pix, promessa de pagamento, webhook ou reconciliação;
- não depender do SDK Mercado Pago.

### Codebase `payments`

- autenticação e autorização server-side dos atores financeiros;
- criação idempotente de Payment e PaymentAttempt;
- criação de Pix e integração encapsulada pelo PaymentProvider;
- validação de transições e reconciliação;
- autenticação, replay protection e processamento do webhook Mercado Pago;
- liquidação transacional de Invoice, InvoiceHistory e proteção contra pagamento duplo;
- promessa de pagamento e emissão mínima de notificações financeiras;
- configuração por Secret Manager, sem valores no repositório.

## Arquivos migrados

Foram migrados de `functions/src` para `payments/src`: `auth/actor.ts`, `config/payment-config.ts`, `invoices/payment-promise.service.ts`, o helper de notificações financeiras, todo o diretório `payments/`, os helpers `shared/` usados por esse domínio e cinco arquivos de testes financeiros. O template `helloWorld` foi substituído pelos exports financeiros reais.

Os arquivos de `functions/lib` não foram usados como fonte. Os artefatos financeiros antigos foram removidos e cada `lib` passou a ser produzido pelo build de sua própria codebase.

## Arquivos preservados

- `firebase.json`, com exatamente duas codebases;
- `firestore.rules` e `firestore.indexes.json`, sem afrouxamento ou publicação;
- contratos do frontend em `src/data/functions/payments.functions.ts`;
- domínio e tipos de apresentação do frontend em `src/payments`;
- nomes, inputs e outputs públicos das cinco Functions;
- regras de 15 dias e histórico da promessa de pagamento;
- modelo monetário `amountCents` inteiro para Payment.

## Decisões

- A promessa de pagamento foi movida porque pertence ao domínio financeiro e seu contrato pôde ser preservado.
- A notificação financeira usa um helper pequeno na codebase, sem duplicar um sistema geral de notificações.
- O cliente Firebase não precisou mudar: a separação por codebase é uma preocupação de implantação do backend e os nomes públicos permaneceram iguais.
- A conversão de Invoice decimal para centavos continua validada no servidor; nenhum valor de Payment usa ponto flutuante internamente.
- O estado `approved` continua derivado exclusivamente do provedor confirmado no backend.
- Pagamento duplicado gera evento para revisão e não substitui silenciosamente `activePaymentId`; refund automático não foi adicionado.

## Dependências

O SDK `mercadopago` foi transferido para `payments/package.json`. A codebase `default` deixou de declará-lo. Ambas usam runtime Node.js 22, coerente com `firebase.json`.

## Segurança e operação

As regras mantêm escrita de Payment, attempts, events, idempotência, webhook markers e controles de Pix bloqueada ao frontend. `MERCADO_PAGO_ACCESS_TOKEN` e `MERCADO_PAGO_WEBHOOK_SECRET` continuam declarados via Secret Manager, sem valores locais. Nenhum deploy, publicação de rules, configuração de segredo ou chamada à API Mercado Pago foi executado.

## Pendências

- configurar com segurança um ambiente Mercado Pago Sandbox;
- executar o primeiro teste Pix real de ponta a ponta somente em uma missão posterior;
- revisar separadamente os avisos moderados informados pelo `npm audit`, sem aplicar atualização forçada nesta consolidação.
