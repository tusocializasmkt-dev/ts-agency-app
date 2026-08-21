# Configuração segura do Mercado Pago Sandbox

## Estado atual

- `MERCADO_PAGO_ACCESS_TOKEN`: **NÃO CONFIGURADO**
- `MERCADO_PAGO_WEBHOOK_SECRET`: **NÃO CONFIGURADO**
- API: Payments API, exclusivamente no Sandbox
- Codebase: `payments`

Nenhum valor de secret deve ser enviado por chat, salvo no frontend, Firestore, documentação ou logs.

## Configuração local pelo operador

1. Acesse a aplicação correta em **Mercado Pago Developers > Suas integrações > Testes > Credenciais de teste**.
2. Confirme visualmente que está na área **Testes**, nunca em Produção.
3. Obtenha o Access Token de teste. A documentação oficial informa que ele começa com `APP_USR`; o backend também bloqueia tokens fora desse padrão e mantém produção desabilitada.
4. Crie manualmente `payments/.secret.local` nesta máquina, sem compartilhar seu conteúdo com o Codex.
5. Use o formato abaixo substituindo os marcadores apenas no arquivo local:

```dotenv
MERCADO_PAGO_ACCESS_TOKEN=<ACCESS_TOKEN_DE_TESTE>
MERCADO_PAGO_WEBHOOK_SECRET=<ASSINATURA_SECRETA_DE_TESTE>
```

6. Não faça commit do arquivo. O padrão `**/.secret.local` está bloqueado no `.gitignore`.

O Webhook Secret só pode ser preenchido depois que uma URL de teste e o evento de pagamentos forem configurados em **Webhooks**. Não invente um valor e não reutilize segredo de produção.

## Conta de teste

Use contas de teste separadas para vendedor e comprador quando o fluxo oficial exigir autenticação do pagador. Não use cliente real e não armazene usuário, senha ou código de verificação no repositório.

Referências oficiais:

- [Credenciais](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/credentials)
- [Contas de teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/resources/test-accounts)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)

## Validação segura posterior

Quando `payments/.secret.local` existir:

1. verificar apenas presença e prefixo esperado, sem imprimir valores;
2. iniciar os emuladores do projeto `gen-lang-client-0975642231` com a codebase `payments`;
3. autenticar um usuário de teste associado a uma Invoice de baixo valor;
4. criar uma única cobrança Pix com uma nova chave UUID;
5. confirmar identificador externo, `pending`, Copia e Cola, QR e expiração sem registrar o código Pix completo;
6. validar realtime na UI;
7. usar apenas o mecanismo oficial Sandbox para aprovação, se disponível.

## Webhook acessível

O Mercado Pago precisa de uma URL HTTPS acessível para entregar um webhook real. Se isso exigir implantação, interrompa o teste e solicite autorização para deploy seletivo destas Functions da codebase `payments`:

- `mercadoPagoWebhook`;
- `createPixPayment`, caso o fluxo de teste também seja remoto;
- `reconcilePayment`, somente se necessária para recuperação administrativa.

Não executar `firebase deploy` genérico, não publicar frontend e não publicar Firestore Rules.

## Limitações atuais

Sem o Access Token de teste local não é possível validar a aceitação da chamada nem gerar Pix Sandbox. Sem URL HTTPS e Webhook Secret de teste não é possível validar a entrega real do webhook. Testes automatizados continuam usando mocks e não fazem chamadas externas.
