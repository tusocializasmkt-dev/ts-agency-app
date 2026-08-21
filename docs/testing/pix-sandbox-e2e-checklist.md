# Checklist E2E — Pix Sandbox

## Pré-requisitos

- [ ] Instalar Java JDK 11 ou superior.
- [ ] Instalar a Firebase CLI oficial e confirmar com `firebase --version`.
- [ ] Executar `firebase projects:list` e identificar manualmente o projeto exclusivo de teste.
- [ ] Associar somente o projeto confirmado com `firebase use --add`.
- [ ] Confirmar que o project ID não pertence à produção.
- [ ] Obter Access Token de teste na aplicação Mercado Pago correta.
- [ ] Obter separadamente o Webhook Secret oficial.
- [ ] Criar `functions/.secret.local` manualmente; nunca versionar ou registrar seus valores.
- [ ] Confirmar conta/aplicação vendedora e comprador de teste, quando aplicável.

## Emulator

- [ ] Executar `npm.cmd run test:rules`.
- [ ] Iniciar Auth 9099, Firestore 8080, Functions 5001 e UI 4000.
- [ ] Confirmar que o project ID usado pelo Emulator é o mesmo do ambiente local de teste.
- [ ] Criar fixture de Brand cliente e Invoice pendente/vencida sem dados reais.

## Criação e UI

- [ ] Autenticar o cliente da fixture.
- [ ] Abrir Financeiro → Pagar agora → Pix.
- [ ] Confirmar Invoice, descrição e valor em centavos.
- [ ] Confirmar Payment `pending`.
- [ ] Confirmar presença estrutural do Copia e Cola, sem registrá-lo.
- [ ] Confirmar QR renderizado, cópia e expiração UTC exibida em horário local.
- [ ] Repetir a mesma idempotencyKey e confirmar o mesmo Payment/cobrança.
- [ ] Simular duplo clique e confirmar uma única intenção.

## Webhook

- [ ] Escolher explicitamente túnel HTTPS confiável ou deploy mínimo em projeto de teste.
- [ ] Configurar somente o evento `payment` na aplicação Mercado Pago de teste.
- [ ] Confirmar `x-signature`, `x-request-id`, `data.id` e ID do evento.
- [ ] Confirmar consulta autenticada ao provider antes de qualquer transition.
- [ ] Reenviar o mesmo evento e confirmar ausência de history/notification duplicados.

## Estados finais

- [ ] Approved: Payment e Attempt approved, Invoice paid, `activePaymentId`, history e notification.
- [ ] Confirmar realtime sem reload.
- [ ] Rejected: Invoice continua aberta.
- [ ] Expired: Invoice continua aberta e botão Gerar novo Pix aparece.
- [ ] Retry com nova chave preserva o Payment anterior.
- [ ] Executar `reconcilePayment` como admin para divergência controlada.

Não registrar secrets, credenciais de conta teste, QR completo ou PII nos resultados.
