# Backend confiável de pagamentos

## 1. Objetivo
Preparar pagamentos server-side sem criar cobrança real.
## 2. Arquitetura
React → Auth → Callable Functions → aplicação server-side → PaymentProvider futuro → Firestore pelo Admin SDK.
## 3. Trust boundary
O navegador nunca define valor, papel, ownership, providerPaymentId ou aprovação.
## 4. Firebase Functions
Functions v2, TypeScript e runtime Node 22 na região `southamerica-east1`.
## 5. Admin SDK
Inicialização única em `shared/admin.ts`; não é importado pelo frontend.
## 6. Authentication
Toda callable exige `request.auth.uid`.
## 7. Authorization
Admin e cliente são resolvidos por documentos confiáveis.
## 8. Actor resolution
`admins/{uid}` tem precedência; caso contrário, `brands/{uid}` define cliente e brandId.
## 9. Ownership
Cliente acessa somente Invoice cujo brandId corresponde ao perfil autenticado.
## 10. Secret Manager
`MERCADO_PAGO_ACCESS_TOKEN` é apenas declarado com `defineSecret`; não existe valor configurado.
## 11. Environments
Somente `sandbox` é permitido para desenvolvimento futuro; production permanece bloqueado.
## 12. Money
Payment utiliza `{ amountCents, currency: 'BRL' }`.
## 13. amountCents
Invoice decimal é validada e convertida para inteiro seguro; migração remota não foi executada.
## 14. Idempotency
`payment_idempotency/{key}` associa UID, Invoice, método e Payment em transação.
## 15. Payment intent
`createPaymentIntent` cria apenas intenção local em `created`, sem chamar gateway.
## 16. PaymentAttempt
Uma tentativa inicial `created` é persistida sem providerAttemptId fictício.
## 17. PaymentEvent
É criado somente `payment_intent_created`, de origem system.
## 18. Status transitions
Helper puro bloqueia transições arbitrárias, inclusive `created → approved`.
## 19. Approved payment
Helper interno prepara liquidação atômica de Invoice; não é endpoint público.
## 20. Double payment
Invoice paga ou com outro activePaymentId gera evento de revisão, sem sobrescrever e sem refund.
## 21. Transactions
Idempotência, Payment, Attempt, Event e futura liquidação usam transações.
## 22. Provider abstraction
Contrato backend não importa React nem o Client SDK.
## 23. Mercado Pago stub
O stub lança `payment-provider-not-configured`; SDK e rede não existem.
## 24. Notifications
Backend descobre admins na coleção confiável e cria notificações system minimizadas.
## 25. Payment Promise
Callable valida autenticação, ownership, overdue, 15 dias, duplicidade, histórico e notificação.
## 26. Firestore Rules
Clients leem apenas próprios dados e não escrevem Payment, Event, Attempt, idempotency ou promise.
## 27. Frontend Functions Client
Component → Hook → Service → `src/data/functions` → Callable.
## 28. Emulator
`firebase.json` reserva Auth 9099, Functions 5001, Firestore 8080 e UI 4000; nenhum projeto remoto é definido.
## 29. Tests
Node test cobre domínio/backend sem Firebase real; Vitest cobre o cliente Callable.
## 30. Logging
Logs estruturados usam apenas IDs, método e status, nunca tokens ou payload integral.
## 31. Security
Zero segredo em VITE, Firestore, código, logs ou arquivos versionados.
## 32. Limitations
Não há gateway, webhook, Pix, cartão, boleto, refund, deploy ou rules publicadas.
## 33. Next mission
Integrar Mercado Pago Sandbox começando somente por Pix de teste.
