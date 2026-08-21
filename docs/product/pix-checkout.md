# Checkout Pix Mercado Pago Sandbox

## API escolhida

O primeiro ciclo Sandbox permanece na **Payments API**, usando o SDK oficial `mercadopago` 3.3.0 sobre `POST /v1/payments` e `GET /v1/payments/{id}`.

A documentação atual também oferece a Orders API (`POST /v1/orders`) como modelo mais novo e unificado. Entretanto, a Payments API continua oficialmente documentada para Pix, exige `X-Idempotency-Key` e entrega os dados necessários de QR Code. Migrar agora alteraria IDs, payloads, consulta de status e tópicos de webhook antes do primeiro teste real. A reavaliação de Orders deve ocorrer depois da estabilização do Pix, especialmente antes de cartão ou boleto.

Referências oficiais consultadas:

- [Modelo de integração: Payments API e Orders API](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/integration-model)
- [Pix com Orders API](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/payment-integration/pix)
- [Pix pela Payments API](https://www.mercadopago.com.br/developers/pt/docs/checkout-bricks/payment-brick/payment-submission/pix)
- [Webhooks e assinatura secreta](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [Credenciais de teste](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials)

## Fluxo

1. O cliente autenticado abre uma Invoice própria e elegível.
2. `createPixPayment` recebe somente `invoiceId` e uma chave idempotente.
3. O backend resolve o ator, ownership, estado e valor da Invoice.
4. O valor é convertido para `amountCents`; o frontend não fornece o total.
5. A intenção, tentativa e proteção idempotente são criadas transacionalmente.
6. O provider envia o valor ao Mercado Pago Sandbox com idempotência oficial.
7. Somente identificador externo, status, Copia e Cola, QR e expiração necessários são persistidos.
8. A Invoice continua aberta enquanto o Payment estiver `pending`.
9. Webhook ou reconciliação consultam o provider de forma autenticada antes de aplicar qualquer transição.
10. Somente `approved` confirmado liquida a Invoice e produz histórico e notificação.

## Idempotência e referência externa

A mesma combinação de chave, usuário, Invoice e método reutiliza o Payment existente. A chave também é enviada como `X-Idempotency-Key`. A referência externa permanece `${invoiceId}/${paymentId}` e não contém nome, e-mail, telefone, CPF ou outro dado pessoal.

## Resposta Pix e QR Code

O domínio mapeia somente `providerPaymentId`, status, Pix Copia e Cola, QR Code base64 opcional e `expiresAt`. A resposta bruta do provider não é armazenada. O QR oficial é renderizado localmente pelo frontend, sem serviço público externo.

## Status internos

- `pending` e `processing`: Invoice continua aberta.
- `approved`: Payment e Attempt são aprovados; Invoice recebe `paid`, `paidAt` e `activePaymentId`; history e notification são criados.
- `expired`: Payment e Attempt expiram; Invoice continua aberta e uma nova tentativa exige nova chave.
- `rejected`: Payment e Attempt são rejeitados; Invoice continua aberta.
- status desconhecido: ignorado com segurança; nunca vira `approved` por fallback.

Se outra cobrança já tiver liquidado a Invoice, `activePaymentId` não é substituído. A ocorrência é registrada para revisão e nenhum refund automático é executado.

## Webhook e reconciliação

`mercadoPagoWebhook` valida `x-signature`, `x-request-id`, `data.id`, janela temporal e replay. O payload recebido não liquida a Invoice diretamente: o backend consulta `GET /v1/payments/{id}` e só então aplica a transação interna.

`reconcilePayment` permanece restrita a administradores como fallback para webhook perdido, timeout ou divergência de status.

Um webhook real requer URL HTTPS acessível. Nenhum deploy ou túnel foi criado nesta missão.

## Frontend e realtime

O checkout existente apresenta Invoice, valor, Pix, QR, Copia e Cola, expiração e status. O frontend observa o Payment no Firestore e atualiza sem reload. Ele não escreve Payment, Attempt ou Event e não pode marcar `approved`.

## Estado do teste Sandbox

O código está preparado, mas o teste real não foi executado porque `payments/.secret.local` não existe. Nenhuma cobrança, QR real de teste, test user ou operação externa foi criada.

Após o operador configurar uma credencial de teste local segura, deve ser criada somente uma cobrança Pix de baixo valor em uma Invoice e usuário exclusivamente de teste.
