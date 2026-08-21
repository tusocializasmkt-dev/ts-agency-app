# Playbook de incidentes de pagamento

## Cobrança criada e sistema não atualizou
Não criar outra cobrança com nova chave. Repetir a operação com a mesma idempotencyKey; se houver `providerPaymentId`, executar `reconcilePayment` como admin.

## Webhook não chegou
Verificar painel de notificações da aplicação de teste, disponibilidade HTTPS e logs por IDs. Consultar o provider via reconciliação. Não alterar Invoice manualmente sem evidência.

## Webhook inválido
Confirmar separadamente Webhook Secret, URL e aplicação. Verificar `x-signature`, `x-request-id`, `data.id` e relógio. Nunca desabilitar a validação.

## Payment approved / Invoice pending
Executar `reconcilePayment(paymentId)` como admin. Conferir history, `activePaymentId` e evento. Escalar se a transação continuar inconsistente.

## Duplicate payment
Preservar o primeiro `activePaymentId`, registrar revisão operacional e contatar o responsável financeiro. Não executar refund automático.

## Provider fora do ar ou timeout
Manter a mesma idempotencyKey. O estado `providerOutcome=unknown` exige recuperação/reconciliação; não repetir cegamente com nova chave.

## Secret rotacionado
Atualizar somente Secret Manager ou `.secret.local`, reiniciar o ambiente e validar assinatura/criação. Revogar a versão comprometida sem registrar valores.

## QR expirado
Aguardar confirmação do provider. Após Payment `expired`, gerar nova tentativa e nova chave, preservando a anterior.

## Evidências permitidas
IDs internos, parte final do provider ID, status, timestamps e correlationId. Proibidos: token, secret, headers completos, PII, QR/Copia e Cola integral.
