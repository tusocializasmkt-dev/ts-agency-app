# Bloco 8E — correção da autenticação na gestão de administradores

## Diagnóstico confirmado

Investigação no workspace `ts-agency-app`, com base local `a337e6a` (hash efetivamente encontrado). Consultas de produção foram somente leitura, no projeto `gen-lang-client-0975642231`.

`manageUserAccess` é uma callable v2 (`onCall`), com CORS e região `southamerica-east1`. O frontend usa `httpsCallable` e `getFunctions` dessa região, vinculados ao mesmo Firebase App de Auth. O SDK inclui automaticamente o Firebase ID token no POST; não é necessário implementar fetch ou headers manuais.

A política IAM consultada do serviço Cloud Run `manageuseraccess` não tinha bindings. O serviço estava ACTIVE, ingress ALLOW_ALL, sem anotação que desabilitasse a verificação IAM. Os logs recentes de 20/09/2026 mostraram **OPTIONS 403**, incluindo 06:15:10 UTC. A mensagem sobre Authorization vazio é do preflight CORS, que não carrega esse header. O navegador é bloqueado antes de enviar o POST autenticado à callable.

As sete callables de comparação têm `allUsers` com `roles/run.invoker`: `createTeamMember`, `updateTeamMember`, `resetTeamMemberPassword`, `createClientAccess`, `createClientWithAccess`, `resetClientPassword` e `setClientAccessStatus`. Portanto, a diferença comprovada está no IAM do serviço novo. Não foi determinado quem/quando deixou essa política sem binding.

`syncPublicAgency` e `syncOperationalBrand` são serviços separados, acionados por eventos Firestore. Não foi encontrada interferência deles no IAM da callable; suas políticas não devem ser abertas. Database ID e regras não foram alterados.

## Duas camadas de segurança

IAM do Cloud Run controla a entrada HTTP e usa identidades Google Cloud. O token de usuário Firebase não substitui essa autenticação IAM. Uma callable de navegador precisa permitir que o preflight alcance o endpoint.

A autenticação Firebase e a autorização administrativa continuam obrigatórias dentro da callable: ausência de sessão resulta em `unauthenticated`; `requireAdmin` mantém a verificação de administrador ativo, usuário não desativado e revogação. Cliente/Equipe não ganham permissão administrativa. Permanecem as proteções contra autoexclusão/autodesativação e a revogação de sessões.

O ajuste IAM proposto libera somente o transporte HTTP deste serviço. Não torna operações administrativas utilizáveis anonimamente. Referências: [protocolo callable](https://firebase.google.com/docs/functions/callable-reference) e [SDK callable](https://firebase.google.com/docs/functions/callable).

## Correções locais e arquivos

- `functions/src/index.ts`: rejeição explícita de chamada sem Firebase Auth antes da inicialização Admin; uso do tradutor de erros na `manageUserAccess`.
- `functions/src/access-management.ts`: identificação específica de senha inválida, sem mudar limites ou regras de negócio.
- `functions/src/access-errors.ts` (novo): tradução segura para códigos callable, preservando erros de autorização e proteção administrativa.
- `src/services/access-error.ts` (novo): mensagens distintas para e-mail utilizado, senha inválida, permissão, sessão ausente/expirada e erro técnico. Não exibe mensagens brutas do backend.
- `src/components/auth/AccessEditor.tsx`, `AccessPanel.tsx`, `PasswordDialog.tsx` e `src/hooks/useAccessManagement.ts`: aplicação das mensagens seguras.
- `src/test/access-errors.test.tsx` (novo): mensagens no formulário e não exposição de detalhes.
- `src/test/access-callable-client.test.ts` (novo): SDK real com fonte de token/fetch simulados, validando região, Authorization no POST e erro sem sessão. Nenhuma chamada à produção.
- `functions/src/test/access-callable.test.ts` (novo): endpoint local real, preflight permitido, POST anônimo negado antes do Admin SDK e códigos de erro distintos.
- Este relatório.

Não foi alterado o cliente callable de produção, pois seu envio de token está correto. Nenhuma alteração em Rules, índices, banco, payments ou implementação OpenAI.

## Validações

Executadas na raiz do workspace:

```powershell
npm.cmd run test:run -- src/test/access-errors.test.tsx src/test/access-callable-client.test.ts src/test/access-panel.test.tsx src/test/access-8e.test.tsx src/test/auth-context.test.tsx src/test/internal-login.test.tsx src/test/router.test.tsx src/test/logout.test.tsx
npm.cmd --prefix functions run build
node --test functions/lib/test/access-callable.test.js functions/lib/test/access-management.test.js functions/lib/test/team-access.test.js functions/lib/test/user-access.test.js
npx.cmd tsc --noEmit
npm.cmd run build
node functions/scripts/check-discovery.mjs
git diff --check
```

- Frontend direcionado: 8 arquivos, 43 testes aprovados. Após ajuste de tipagem no teste do SDK, seu arquivo foi novamente executado: 2 testes aprovados.
- Backend direcionado: 26 testes aprovados, 0 falhas, 0 ignorados. Inclui negação de ações para Cliente/Equipe, proteção do próprio Admin e revogação/preservação dos dados da marca.
- Build Functions aprovado.
- TypeScript frontend (`tsc --noEmit`) aprovado, sem erros.
- Build frontend aprovado, com aviso de chunk maior que 500 kB.
- `git diff --check` aprovado; nenhum arquivo staged.
- Discovery local aprovado: 14 endpoints em 5.706 ms, abaixo do limite de 10.000 ms.
- Tentativas de Vite/Vitest bloqueadas pelo sandbox foram repetidas com autorização fora dele. Problemas iniciais de tipagem dos testes foram corrigidos.

## Publicação pendente — comandos NÃO executados

A correção essencial do incidente é o IAM de **somente `manageuseraccess`**. Republicar a Function sozinha não garante reparar a política: no Firebase CLI 15.26.0 instalado, o caminho de criação configura o invoker público para callable, mas o caminho de atualização v2 não faz esse ajuste para callable. O SDK 7.3.2 também não inclui `invoker` no manifest callable; adicionar essa opção ao código não seria uma correção efetiva.

Para publicar os novos códigos de erro e a rejeição explícita, somente esta Function precisa de novo deploy, após autorização:

```powershell
firebase.cmd deploy --config "C:\Users\samsung\OneDrive\Desktop\ts-agency-app\firebase.json" --project gen-lang-client-0975642231 --only "functions:default:manageUserAccess"
```

Depois, reparar o binding específico, com uma conta autorizada a administrar IAM desse serviço:

```powershell
gcloud.cmd run services add-iam-policy-binding manageuseraccess --region=southamerica-east1 --project=gen-lang-client-0975642231 --member=allUsers --role=roles/run.invoker
```

Não aplicar esse binding no projeto inteiro ou nos triggers Firestore. Não republicar marketingAssistant ou payments. As mensagens novas da interface também precisam de publicação posterior no projeto Vercel `ts-agency-app` pelo fluxo Git/Vercel autorizado.

Após publicação autorizada, verificar preflight bem-sucedido, POST anônimo rejeitado, Cliente/Equipe sem permissão e criação administrativa com conta de teste autorizada. Testes locais não substituem essa confirmação em produção.

Até o reparo IAM autorizado, o bloqueio remoto continua. Nenhum deploy, alteração IAM, git add, commit ou push foi realizado nesta missão.
