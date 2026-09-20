# Bloco 8E — Login, gestão de acessos, sessão e suporte

Projeto exclusivo: `C:\Users\samsung\OneDrive\Desktop\ts-agency-app`.
Implementação local. Nenhum commit, push, deploy ou alteração de dados de produção foi executado.

## Diagnóstico da arquitetura existente

- O login já utilizava Firebase Authentication por e-mail e senha. O AuthProvider resolvia Admin por `admins/{uid}`, Equipe por `team_members/{uid}` e Cliente por `brands/{uid}`.
- Já existiam Functions para criação, senha e status de clientes e membros da equipe, componentes de modal, confirmação, feedback, hooks e repositories. Foram reutilizados.
- Faltavam a administração de outros administradores, remoção isolada do login do cliente, persistência explícita e restauração segura da última rota.
- A equipe já tinha `brandIds`, mas lia documentos completos de marcas/configurações; isso não permite proteger campos financeiros individuais. Foram introduzidas projeções com campos permitidos, mantidas pelo backend.
- Havia um contato “Falar com a agência” no financeiro do cliente usando telefone configurável. Foi centralizado junto com o suporte da navegação e a recuperação de acesso.
- Configuração local confirmada: projeto Firebase `gen-lang-client-0975642231`, domínio de autenticação `gen-lang-client-0975642231.firebaseapp.com`, banco nomeado `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58`, Functions em `southamerica-east1`. Nenhuma credencial foi incluída neste relatório. Configuração efetivamente publicada na Vercel não foi consultada ou alterada.

## Funcionalidades implementadas

1. Campo de senha reutilizável, oculto inicialmente, com botão acessível por teclado, rótulos “Mostrar senha”/“Ocultar senha” e preservação do valor digitado. Aplicado no login e formulários administrativos pertinentes.
2. “Esqueci minha senha” abre exclusivamente WhatsApp `+55 11 98623-7487`, com mensagem fixa de recuperação, sem credenciais ou identificadores. Não há `sendPasswordResetEmail` no frontend.
3. Links de suporte centralizados em `supportUrl`, incluindo o contato já existente no financeiro. Nova aba com `noopener noreferrer`.
4. Área “Administradores” exclusiva de Admin: listar, criar, editar nome/e-mail, definir nova senha, ativar, desativar e remover. Ações de alteração/exclusão têm confirmação; nenhuma senha existente é consultada.
5. Equipe preservada com Manager/Social Media e atribuição por `brandIds`. E-mail de acesso também é atualizado no Authentication; remoção usa backend seguro.
6. Painel de acesso do cliente consulta a existência real do usuário Auth. Permite criar, editar, redefinir senha, ativar/desativar e remover somente o login. Remoção mantém empresa, posts, calendário, mídias, faturas, insights e histórico.
7. `setPersistence(auth, browserLocalPersistence)` antes do login. Logout usa `signOut`. O Firebase continua sendo a única autenticação.
8. Última rota salva por UID, somente pathname, sem query, token ou senha. Rotas são verificadas contra perfil, escopo e existência da marca; rotas inválidas voltam ao dashboard. Logout limpa a rota do usuário.
9. Perfil observado em tempo real e renovação de token em foco/periódica para reconhecer revogações. Desativação não é revertida ao redefinir senha.
10. Erros técnicos não são mais classificados indiscriminadamente como senha incorreta. Falhas de carregamento do perfil continuam separadas do login.

## Permissões finais

| Perfil | Gestão de contas | Marcas e trabalho operacional | Financeiro |
|---|---|---|---|
| Admin ativo | Admins, equipe e clientes pelo backend | Acesso administrativo | Permitido conforme arquitetura existente |
| Manager / Social Media ativos | Negada, inclusive chamada direta | Somente `brandIds`, com documentos operacionais sem campos financeiros | Rotas, consultas e regras bloqueiam acesso administrativo |
| Cliente habilitado | Negada; recuperação somente por suporte | Própria marca e permissões existentes | Somente próprios dados, conforme regras existentes |
| Conta desativada | Negada | Perfil bloqueado e sessão encerrada no aplicativo | Negado pelas verificações de perfil |

`status` comercial permanece separado de `accessEnabled`. Nenhuma alteração automática do status comercial foi acrescentada. O Admin não pode remover/desativar a própria conta. A desativação/remoção de outro Admin usa transação que revalida o ator e a existência de outro perfil ativo, protegendo também contra alterações concorrentes.

## Backend, regras e preparação dos dados

Functions novas:

- `manageUserAccess`: valida Admin ativo no Firestore e Authentication, revogação da sessão e tipo do alvo. Usa Admin SDK para operações sensíveis, retorna apenas dados de perfil e bloqueia primeiro o perfil em ações destrutivas.
- `syncOperationalBrand`: mantém `team_brands/{brandId}` com lista explícita de campos operacionais, sem contrato, observações internas ou campos de cobrança. Preserva o link legado de Drive.
- `syncPublicAgency`: mantém `agency_public/{configId}` sem configurações financeiras.

Functions existentes alteradas: `createClientAccess`, `createClientWithAccess`, `resetClientPassword`, `setClientAccessStatus`, `createTeamMember`, `updateTeamMember`, `resetTeamMemberPassword` e a autorização do legado desativado `setInternalCredential`. Reutilizam a autorização reforçada; operações de cliente/equipe verificam o tipo do alvo.

No codebase `payments`, somente o resolvedor compartilhado de autorização foi ajustado para negar Admin inativo e Cliente desativado. Afeta as Functions existentes `createPaymentIntent`, `requestPaymentPromise`, `createPixPayment` e `reconcilePayment`. Não foi implementado ou modificado gateway, webhook ou fluxo de cobrança.

Regras alteradas:

- `firestore.rules`: Admin ativo, Cliente habilitado, projeções operacionais de leitura, vedação de escrita direta de perfis administrativos, isolamento financeiro e de marcas, bloqueio de mídia financeira para equipe.
- `storage.rules`: equipe só lê/gerencia categorias operacionais; não pode sobrescrever uma fatura classificando-a como conteúdo operacional; objetos legados sem categoria ficam bloqueados para equipe.
- `firestore.indexes.json`: quatro índices para consultas de mídia com `teamVisible`.

O script `functions/scripts/prepare-access-8e.mjs` prepara documentos operacionais, `teamVisible` e metadados de categoria do Storage. Sem `--apply`, somente consulta e conta registros. Exige projeto explícito para gravar. **O script não foi executado contra produção, nem mesmo em modo de consulta.** Sua sintaxe foi validada localmente.

## Validações

- Frontend, lote principal: 14 arquivos / 61 testes aprovados.
- Frontend, hooks/repositories/services e revisão de controles: 5 arquivos / 25 testes aprovados. Há testes repetidos entre os lotes.
- Frontend, login/mídias/campo de senha final: 3 arquivos / 17 testes aprovados.
- Frontend, contato no financeiro: 1 arquivo / 2 testes aprovados. No total, 19 arquivos distintos e 88 testes distintos de frontend foram cobertos pelos lotes, com algumas reexecuções.
- Backend: 31 testes aprovados, sendo 24 de gestão de acessos e 7 do resolvedor financeiro/fluxo existente relacionado. Após o ajuste de compatibilidade da projeção, seus 10 testes foram repetidos e passaram.
- Firestore + Storage nos emuladores do projeto fictício `demo-ts-agency-rules`: 21 testes aprovados, zero falhas e zero ignorados.
- TypeScript do frontend (`npx.cmd tsc --noEmit`) e builds TypeScript de `functions` e `payments`: aprovados.
- Lint de `payments`: zero erros e 11 avisos em arquivos preexistentes fora das alterações funcionais deste bloco.
- Build do frontend: aprovado, com aviso de chunk principal acima de 500 kB. Rotas continuam com `lazy`/`Suspense`; o build gera chunks separados, inclusive Administradores.
- `git diff --check`: sem erros. Nenhum arquivo foi adicionado ao staging.
- A suíte completa do frontend não foi executada, conforme solicitado. Testes usam mocks ou emuladores; não comprovam configuração ou publicação remota.

## Limitações e pendências de publicação

- Preparar os registros existentes e aguardar a criação dos índices antes de liberar a versão. Sem isso, a equipe poderá não encontrar marcas/mídias até a preparação terminar.
- Usar janela coordenada sem edições/uploads durante a preparação final e a troca de versão. Clientes com versão antiga aberta precisam atualizar a página. Objetos sem classificação conhecida são tratados como privados para equipe e precisam de classificação administrativa posterior, caso sejam operacionais.
- Storage usa claims porque as regras atuais não consultam o banco Firestore nomeado. Tokens já emitidos podem conservar permissões até sua renovação/expiração; revogar refresh tokens não invalida instantaneamente todos os ID tokens já emitidos. O aplicativo observa o perfil e força atualização periódica/em foco, mas isso não equivale a revogação imediata de um token copiado externamente.
- URLs de download do Firebase que já foram compartilhadas continuam sendo links portadores de autorização. As regras não revogam automaticamente esses links. Não foi feita rotação de tokens de download, pois isso afeta URLs existentes. A proteção validada refere-se às novas consultas/acessos autenticados e ao isolamento de documentos.
- O 404 da Vercel ao atualizar uma rota interna continua pendente, expressamente fora deste bloco. Persistência/restauração funciona depois que o frontend é carregado; não corrige o roteamento do servidor.
- A proporção das imagens de Feed não foi alterada. IA/OpenAI não recebeu alterações funcionais.
- Ainda é necessário teste funcional após publicação autorizada com contas Admin, Manager/Social Media e Cliente, incluindo fechar/reabrir navegador. Nenhuma conta real foi alterada para teste.

## Comandos para publicação — somente após autorização

Executar na raiz do projeto correto. Usar credenciais administrativas já configuradas (ADC) para o script; não colocar arquivos de credenciais no repositório. Publicar no Firebase antes do frontend. Confirmar que `VITE_USE_FIREBASE_EMULATORS` não está ativo no ambiente de produção.

### Firebase

Após o timeout de discovery reportado durante a tentativa manual, acrescentar uma verificação local e uma margem de inicialização na mesma sessão PowerShell do deploy. `FUNCTIONS_DISCOVERY_TIMEOUT` é expresso em **segundos**; não altera timeout das Functions, permissões ou comportamento em produção. Não substitui a validação local de 10 segundos.

```powershell
npm.cmd --prefix functions run build
npm.cmd --prefix payments run lint
npm.cmd --prefix payments run build
node functions/scripts/check-discovery.mjs
$env:FUNCTIONS_DISCOVERY_TIMEOUT = '30'
firebase.cmd deploy --project gen-lang-client-0975642231 --only "functions:default:manageUserAccess,functions:default:syncOperationalBrand,functions:default:syncPublicAgency,functions:default:createClientAccess,functions:default:createClientWithAccess,functions:default:resetClientPassword,functions:default:setClientAccessStatus,functions:default:createTeamMember,functions:default:updateTeamMember,functions:default:resetTeamMemberPassword,functions:default:setInternalCredential"
firebase.cmd deploy --project gen-lang-client-0975642231 --only "functions:createPaymentIntent,functions:requestPaymentPromise,functions:createPixPayment,functions:reconcilePayment"
firebase.cmd deploy --project gen-lang-client-0975642231 --only firestore:indexes
node functions/scripts/prepare-access-8e.mjs
```

Revisar o resultado da consulta, aguardar índices prontos e iniciar a janela coordenada. A segunda publicação acima atualiza somente a autorização das Functions financeiras já existentes; não deve ser usada para inaugurar produtos de pagamento ainda não publicados.

```powershell
node functions/scripts/prepare-access-8e.mjs --apply --project=gen-lang-client-0975642231
firebase.cmd deploy --project gen-lang-client-0975642231 --only "firestore:rules,storage"
```

### Git / Vercel

Branch local observada: `main`; remoto existente: `origin`. Os comandos abaixo são instruções, não foram executados. Revisar o diff novamente antes de staging, especialmente se houver trabalho posterior.

```powershell
git diff --check
git diff --stat
git add -- src functions/src functions/scripts/prepare-access-8e.mjs functions/scripts/check-discovery.mjs payments/src/auth/actor.ts payments/src/shared/admin.ts payments/src/test/promise-auth.test.ts firestore.rules firestore.indexes.json storage.rules test/rules/payments.rules.test.mjs docs/BLOCO-8E-RELATORIO.md
git commit -m "feat: finalize access management and persistent sessions"
git push origin main
```

O push só publica automaticamente se a integração Git estiver vinculada ao projeto Vercel **ts-agency-app** e a `main` for a branch de produção; essa configuração remota não foi verificada. Caso seja escolhida publicação por CLI em vez da integração Git:

```powershell
npx.cmd vercel link --project ts-agency-app
npx.cmd vercel --prod
```

Na vinculação, selecionar a conta/equipe proprietária do projeto correto; não selecionar o projeto antigo `ts-app`. Não é necessário executar as duas formas de publicação.

## Inventário de arquivos

### Adendo — banco nomeado e validação de triggers

O erro 404 do banco `(default)` vinha do trigger preexistente `syncBrandShowcase`, cuja configuração omitira `database`. O SDK emitia `eventFilters.database = '(default)'`. Na CLI 15.26.0, `prepare` chama `ensureTriggerRegions(wantBackend)` antes de construir o backend filtrado por `--only`; a consulta de localização desse trigger ocorria mesmo fora da seleção de publicação. `firebase.json` já apontava para o banco correto e não substitui o banco declarado em cada trigger.

Correção mínima: `syncBrandShowcase` agora recebe o mesmo `databaseId` dos dois triggers novos; o Admin SDK do codebase default reutiliza essa constante. Também foi corrigido `payments/src/shared/admin.ts`, onde `getFirestore(adminApp)` ainda selecionava implicitamente o banco padrão. Todos usam `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58` na configuração local validada. O override existente `FIRESTORE_DATABASE_ID` foi preservado; não foram encontrados overrides locais divergentes. Nenhum banco foi criado, migrado ou alterado remotamente.

O teste de discovery agora verifica todos os triggers Firestore, incluindo os preexistentes. `namespace: '(default)'` no manifesto é o namespace normal do Firestore, não o ID do banco, e permanece correto.

Validações: builds de `functions` e `payments` aprovados; discovery HTTP 200 em 2.422 ms com 14 endpoints; 21 testes direcionados de acessos, prova social e autorização financeira aprovados; `git diff --check` aprovado. Um teste da rotina instalada da CLI, com `getDatabase` mockado, confirmou somente a consulta ao banco nomeado. Frontend, `firebase.json` e a instância local do SDK de `payments` também foram conferidos contra o mesmo ID, sem chamadas remotas.

Arquivos desta correção: `functions/src/index.ts`, `payments/src/shared/admin.ts`, `functions/scripts/check-discovery.mjs` e este relatório. A lógica da prova social não foi alterada. O comando administrativo parcial permanece igual e exclui `syncBrandShowcase` e `payments`: suas correções locais só atingirão versões remotas se esses endpoints forem publicados explicitamente em uma etapa futura. A eventual migração do trigger preexistente, se já houver versão remota ligada a outro banco, deve ser examinada separadamente; não foi executada nenhuma exclusão/recriação.

Na futura etapa de Git, incluir também `payments/src/shared/admin.ts`. O inventário/estatística do fechamento inicial abaixo deve ser interpretado junto com estes adendos.

### Adendo — validação de discovery após tentativa manual

O erro informado ocorreu na descoberta local do codebase `default`, antes da publicação. Não foi encontrado `firebase-debug.log` no workspace para reconstruir aquela execução. A reprodução local respondeu HTTP 200 em aproximadamente 2 segundos, com as 14 Functions e os dois novos triggers no banco nomeado correto, dentro do limite original de 10 segundos. O carregamento direto ficou em aproximadamente 1,6 segundo. Não houve reprodução do timeout informado.

Os imports transitivos do SDK Firebase (HTTPS/Auth e Firestore/Google Cloud) concentram o custo de carregamento. Esses providers já existiam antes do Bloco 8E. As dependências e lockfile de `functions` não foram alterados pelo bloco. Admin SDK continua inicializado somente sob demanda, sem apps inicializados no discovery; OpenAI não é carregado nessa etapa. Portanto, não há evidência de regressão funcional do 8E nem base para afirmar que OneDrive, antivírus ou rede causaram a demora original.

A correção operacional mínima acrescenta a margem de 30 segundos da CLI e o script local `functions/scripts/check-discovery.mjs`, sem modificar handlers. O script inicia apenas o servidor de discovery do SDK, consulta `127.0.0.1`, valida o manifesto e encerra o processo. Não chama Functions, não consulta produção e não executa deploy. O script mantém seu próprio limite de 10 segundos independentemente da margem da CLI.

Resultados desta investigação: discovery em 2.042 ms, 2.017 ms e 2.475 ms, sempre HTTP 200 e 14 endpoints; build TypeScript das Functions aprovado; 24 testes direcionados aprovados, zero falhas/ignorados; sintaxe do script e `git diff --check` aprovados.

Referência oficial: [Firebase — evitar timeouts durante inicialização](https://firebase.google.com/docs/functions/tips#avoid_deployment_timeouts_during_initialization).

Na publicação futura pelo Git, incluir também `functions/scripts/check-discovery.mjs` no staging revisado. Nenhum comando de publicação foi executado por esta investigação. A sequência de preparação de dados, índices, regras e frontend permanece a mesma.

### Adendo — secret OpenAI em deploy parcial

A CLI instalada (`firebase-tools` 15.26.0) resolve os parâmetros declarados no codebase antes de filtrar os endpoints de `--only`: `prepare.resolveBackend` chama `params.resolveParams`, que chama `ensureSecret`/`getSecretMetadata` para cada parâmetro secret global. `defineSecret('OPENAI_API_KEY')` produzia esse parâmetro global, embora o vínculo de execução fosse exclusivo de `marketingAssistant`. Isso explica a consulta do Secret Manager durante o deploy administrativo. Não havia compartilhamento da chave com todas as Functions nem leitura do seu valor no discovery.

Correção local mínima: substituir o objeto criado por `defineSecret` pelo nome do secret em `secrets: [openAiApiKey]`, lendo `process.env[openAiApiKey]` apenas na execução da IA. O vínculo continua sendo de Secret Manager; nenhuma chave foi colocada em arquivo, frontend ou variável comum de configuração. `marketingAssistant` permanece exportada com os mesmos parâmetros, import tardio do OpenAI e lógica de negócio. Nenhum secret remoto foi consultado, alterado ou removido nesta investigação.

Validação: build aprovado; discovery HTTP 200 em 2.282 ms; 14 especificações de endpoints idênticas antes/depois e zero parâmetros secrets globais; 16 testes de acessos/IA aprovados; teste local do resolvedor da CLI com Secret Manager mockado confirmou uma consulta antes e zero após a correção. O teste de discovery passa a verificar também o vínculo exclusivo do secret e a ausência de parâmetros secrets globais.

Próxima tentativa administrativa: usar seletores explícitos `functions:default:NOME`, mantendo a margem de discovery na sessão PowerShell. Isso exclui o codebase `payments` e a Function `marketingAssistant` da seleção de publicação. A correção resolve a consulta antecipada ao secret; não dispensa requisitos de billing de outros serviços do Firebase/Google Cloud. Se uma etapa posterior exigir billing, interromper e avaliar, sem habilitá-lo automaticamente. Nenhum deploy foi executado.

O inventário abaixo abrange os arquivos modificados e novos do bloco, incluindo este relatório. Nenhum arquivo foi staged.

41 arquivos versionados alterados e 21 arquivos novos (incluindo o adendo de discovery). `git diff --stat` considera apenas os versionados: 427 inserções e 135 remoções.

- [functions/scripts/check-discovery.mjs](</C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/scripts/check-discovery.mjs>) — novo, adendo de discovery

- [docs/BLOCO-8E-RELATORIO.md](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/docs/BLOCO-8E-RELATORIO.md>) — novo
- [firestore.indexes.json](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/firestore.indexes.json>) — alterado
- [firestore.rules](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/firestore.rules>) — alterado
- [functions/scripts/prepare-access-8e.mjs](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/scripts/prepare-access-8e.mjs>) — novo
- [functions/src/access-management.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/src/access-management.ts>) — novo
- [functions/src/index.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/src/index.ts>) — alterado
- [functions/src/operational-projection.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/src/operational-projection.ts>) — novo
- [functions/src/team-access.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/src/team-access.ts>) — alterado
- [functions/src/test/access-management.test.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/functions/src/test/access-management.test.ts>) — novo
- [payments/src/auth/actor.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/payments/src/auth/actor.ts>) — alterado
- [payments/src/test/promise-auth.test.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/payments/src/test/promise-auth.test.ts>) — alterado
- [src/app/layouts/AuthenticatedLayout.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/app/layouts/AuthenticatedLayout.tsx>) — alterado
- [src/app/router/AppRouter.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/app/router/AppRouter.tsx>) — alterado
- [src/app/router/ProtectedRoute.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/app/router/ProtectedRoute.tsx>) — alterado
- [src/app/router/RememberRoute.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/app/router/RememberRoute.tsx>) — novo
- [src/app/router/ResumeRoute.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/app/router/ResumeRoute.tsx>) — novo
- [src/app/router/RootRedirect.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/app/router/RootRedirect.tsx>) — alterado
- [src/app/router/last-route.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/app/router/last-route.ts>) — novo
- [src/app/router/routes.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/app/router/routes.ts>) — alterado
- [src/components/Admin/BrandDetail.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/Admin/BrandDetail.tsx>) — alterado
- [src/components/Admin/ClientDialog.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/Admin/ClientDialog.tsx>) — alterado
- [src/components/Admin/TeamMemberDialog.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/Admin/TeamMemberDialog.tsx>) — alterado
- [src/components/DashboardCards.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/DashboardCards.tsx>) — alterado
- [src/components/FinanceView.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/FinanceView.tsx>) — alterado
- [src/components/LoginPage.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/LoginPage.tsx>) — alterado
- [src/components/Sidebar.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/Sidebar.tsx>) — alterado
- [src/components/auth/AccessEditor.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/auth/AccessEditor.tsx>) — novo
- [src/components/auth/AccessPanel.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/auth/AccessPanel.tsx>) — novo
- [src/components/auth/PasswordDialog.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/auth/PasswordDialog.tsx>) — alterado
- [src/components/auth/PasswordInput.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/components/auth/PasswordInput.tsx>) — novo
- [src/config/support.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/config/support.ts>) — novo
- [src/contexts/AuthContext.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/contexts/AuthContext.tsx>) — alterado
- [src/data/functions/access.functions.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/data/functions/access.functions.ts>) — novo
- [src/data/repositories/agency-config.repository.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/data/repositories/agency-config.repository.ts>) — alterado
- [src/data/repositories/brands.repository.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/data/repositories/brands.repository.ts>) — alterado
- [src/data/repositories/media.repository.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/data/repositories/media.repository.ts>) — alterado
- [src/data/repositories/storage.repository.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/data/repositories/storage.repository.ts>) — alterado
- [src/hooks/useAccessManagement.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/hooks/useAccessManagement.ts>) — novo
- [src/hooks/useAgencyConfig.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/hooks/useAgencyConfig.ts>) — alterado
- [src/hooks/useBrands.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/hooks/useBrands.ts>) — alterado
- [src/hooks/useInvoices.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/hooks/useInvoices.ts>) — alterado
- [src/media/media.types.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/media/media.types.ts>) — alterado
- [src/pages/admin/AdminAccessPage.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/pages/admin/AdminAccessPage.tsx>) — novo
- [src/pages/admin/AdminClientDetailPage.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/pages/admin/AdminClientDetailPage.tsx>) — alterado
- [src/pages/admin/AdminTeamPage.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/pages/admin/AdminTeamPage.tsx>) — alterado
- [src/pages/public/LoginPage.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/pages/public/LoginPage.tsx>) — alterado
- [src/services/access.service.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/services/access.service.ts>) — novo
- [src/services/auth-session.service.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/services/auth-session.service.ts>) — novo
- [src/services/media.service.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/services/media.service.ts>) — alterado
- [src/test/access-8e.test.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/access-8e.test.tsx>) — novo
- [src/test/access-panel.test.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/access-panel.test.tsx>) — novo
- [src/test/auth-context.test.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/auth-context.test.tsx>) — alterado
- [src/test/finance-view.test.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/finance-view.test.tsx>) — alterado
- [src/test/hooks.test.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/hooks.test.tsx>) — alterado
- [src/test/internal-login.test.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/internal-login.test.tsx>) — alterado
- [src/test/logout.test.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/logout.test.tsx>) — alterado
- [src/test/media-repository.test.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/media-repository.test.ts>) — alterado
- [src/test/repositories.test.ts](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/repositories.test.ts>) — alterado
- [src/test/resume-route.test.tsx](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/src/test/resume-route.test.tsx>) — novo
- [storage.rules](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/storage.rules>) — alterado
- [test/rules/payments.rules.test.mjs](<C:/Users/samsung/OneDrive/Desktop/ts-agency-app/test/rules/payments.rules.test.mjs>) — alterado
