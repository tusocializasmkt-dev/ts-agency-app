# Arquitetura financeira e Payment Provider

## 1. Objetivo
Separar obrigação, pagamento, tentativa, evento e provedor sem processar cobranças nesta fase.
## 2. Visão geral
O frontend solicita ao backend confiável; o backend usa uma abstração `PaymentProvider` e persiste resultados auditáveis.
## 3. Invoice
Representa a obrigação financeira e nunca armazena dados de cartão.
## 4. Payment
Representa um pagamento associado à fatura; uma fatura pode possuir vários pagamentos.
## 5. PaymentAttempt
Preserva cada tentativa sem sobrescrever tentativas anteriores.
## 6. PaymentEvent
Registra eventos técnicos mínimos, sem payload sensível integral.
## 7. Invoice status
`pending`, `overdue`, `paid`, `suspended` e `cancelled`.
## 8. Payment status
`created`, `pending`, `processing`, `approved`, `rejected`, `cancelled`, `expired` e `refunded`.
## 9. Payment methods
Somente `pix`, `credit_card` e `boleto`.
## 10. PaymentProvider
Contrato independente de SDK para criar, consultar, cancelar, reembolsar e validar eventos.
## 11. MercadoPagoProvider
Stub seguro que lança erro controlado; não usa rede, SDK ou credencial.
## 12. Backend confiável
Functions v2 autenticam, autorizam, buscam o valor oficial da Invoice, convertem para amountCents, aplicam idempotência e escrevem via Admin SDK.
## 13. Segredos
Credenciais privadas nunca entram em React, bundle Vite, Firestore ou storage do navegador; ficam em Secret Manager ou ambiente server-side.
## 14. Cartão
SDK do provider tokeniza no cliente; somente token descartável chega ao backend. PAN e CVV nunca são recebidos ou persistidos.
## 15. Pix
Resposta transitória contém código, imagem/URL e expiração. Base64 grande não deve ser persistido no Firestore.
## 16. Boleto
Gateway retorna código, linha digitável, URL e expiração; `boletoUrl` legado continua distinguido como documento manual.
## 17. Provider config
Firestore guarda apenas provider, habilitação, ambiente, métodos e autoria; nunca segredo.
## 18. Ambientes
`sandbox` e `production`; ativação de production pertence ao backend e não ao frontend.
## 19. Idempotência
O cliente fornece uma UUID de intenção; o backend valida e vincula UID, Invoice, método e Payment em `payment_idempotency`. Timestamps isolados não são suficientes.
## 20. External reference
Formato `invoiceId/paymentId`, sem dados pessoais ou sensíveis.
## 21. Relações
Invoice 1:N Payments; Payment 1:N Attempts e 1:N Events.
## 22. Concorrência
Múltiplas tentativas podem coexistir; a primeira aprovação válida liquida a fatura e as demais são canceladas/ignoradas quando possível.
## 23. Double payment
Duas aprovações geram evento de duplicidade e revisão manual; não há refund automático.
## 24. Webhook
Endpoint futuro verifica autenticidade e, quando possível, confirma o estado diretamente no provider antes de persistir.
## 25. Webhook idempotente
`providerEventId` impede repetição de efeitos. Estados: received, processing, processed, failed e ignored.
## 26. Collections
`invoices`, `payments`, subcoleções `attempts`/`events` e `payment_provider_config/default`.
## 27. Segurança Firestore
Cliente lê somente a própria marca; admin lê; todos os writes de Payment são negados ao SDK cliente.
## 28. Payment service
O frontend delega `createPaymentIntent` à Callable. O backend cria somente Payment local `created`; nenhuma cobrança é enviada ao provider.
## 29. Backend contract
Entrada: invoiceId, method, idempotencyKey e token descartável opcional. O backend ignora valores financeiros enviados pelo cliente e usa a Invoice oficial.
## 30. Checkout
Máquina futura: idle → selecting_method → creating_payment → awaiting_payment/processing → approved/rejected/expired/error.
## 31. Pix UI futura
QR Code, copia e cola, expiração, estado e retorno.
## 32. Card UI futura
Tokenização pelo SDK seguro, nunca inputs próprios que transmitam PAN ao backend.
## 33. Boleto UI futura
Código, linha digitável, vencimento e link do boleto.
## 34. Status UI
Componente apresentará aguardando, processando, aprovado, rejeitado, expirado e cancelado.
## 35. Realtime
Backend atualiza Payment e a assinatura Firestore reflete o estado; polling limitado de 10s/30 tentativas é apenas fallback futuro.
## 36. Invoice history
Histórico legível derivará de eventos relevantes sem duplicar todos os eventos técnicos.
## 37. Notifications
O backend possui criação system e descoberta confiável de admins; promessa cliente→admin já usa essa fronteira.
## 38. Payment Promise
Promessa permanece conceito separado e nunca é PaymentAttempt.
## 39. Manual payment
Será Payment com provider `manual`, criado exclusivamente por operação administrativa confiável.
## 40. Refund
Status e método de provider estão previstos, sem automação implementada.
## 41. Auditoria
Transições registram ator/system, origem, data, entidade e mudança.
## 42. Logs
Logs server-side estruturados e minimizados; nunca tokens, cartão ou payload sensível.
## 43. LGPD/PCI
Minimização, tokenização, isolamento, retenção definida e acesso administrativo restrito; não constitui parecer jurídico.
## 44. Errors
Erros do provider são convertidos para códigos seguros e mensagens amigáveis.
## 45. Tests
Testes cobrem estados separados, idempotência, concorrência, duplicidade, erros e provider stub.
## 46. Security
Auditoria estática impede credenciais, campos PCI e writes de Payment em componentes.
## 47. Roadmap
Implementação segue do núcleo de Invoice ao backend, sandbox, checkouts, webhook e auditoria.
## 48. Riscos
Race conditions, duplicidade, indisponibilidade do provider, reentrega de webhook e configuração acidental de production.
## 49. Pendências
Implementar núcleo de Invoice, backend seguro, testes de rules/emulator e somente depois integrar sandbox.
