# Aparência, comunicados e investigação do logotipo

Entrega local em 17/10/2026, no workspace TS Agency App. Sem commit, push, deploy, concessão de permissões em produção ou envio a clientes reais.

## Resultado funcional

- Configurações → **Aparência e Personalização**: círculo cromático arrastável com teclado, tonalidade, saturação, luminosidade, opacidade e HEX de seis/oito dígitos. Prévia local e aplicação global são ações distintas.
- Biblioteca de combinações próprias no Firestore: criar, carregar, editar, salvar e aplicar; carregar original e descartar prévia.
- Cores independentes de menu lateral, cabeçalho móvel, destaque interativo, detalhes do Dashboard e Feed. Cores semânticas de aprovação, cobrança e outros status não foram substituídas. A alteração no Feed é exclusivamente de apresentação.
- Fundos independentes de menu/cabeçalho: enviar/substituir, visualizar, remover da combinação, posição vertical, escala e sobreposição. PNG/JPEG/WebP até 2 MiB e 16 megapixels, com decodificação no navegador. O rodapé global não existe e não foi criado. O cabeçalho existente continua restrito ao celular.
- Texto preto/branco escolhido por luminância; transparência composta sobre o canvas branco. A sobreposição do fundo aumenta automaticamente quando necessário para manter contraste de texto de 4,5:1 mesmo considerando os extremos de uma imagem. O texto de status preserva as classes existentes.
- Notificações → **Comunicados**: título, mensagem, imagem, todos os clientes ativos ou seleção específica, rascunho, envio imediato, agendamento e edição dos rascunhos/agendados. Salvar um agendado como rascunho retira-o da fila. Histórico dos últimos 100 com status, entregas e conteúdo completo.
- Clientes ativos para envio: `status == active` e `accessEnabled != false`, reavaliados no backend a cada lote. A opção “todos” considera os clientes elegíveis no processamento; a seleção manual é limitada a 500 IDs únicos.
- Agendamento recebe o instante UTC calculado a partir do horário local indicado no formulário; fuso exibido ao lado do campo. Scheduler executa a cada minuto, inclusive com o navegador fechado. Horário representa início elegível de processamento, sujeito à disponibilidade do serviço e fila, sem promessa de entrega no segundo exato.
- Comunicado vira uma notificação por destinatário, com conteúdo e imagem preservados no histórico. Nenhum documento coletivo é exposto ao cliente.
- Pop-up exclusivo de comunicados marcados para isso, sem uso em notificações operacionais. Dispensa é registrada por destinatário no Firestore, independentemente da marcação de leitura. Cache local por UID fecha imediatamente inclusive sem rede; no próximo acesso, tenta sincronizar dispensas ainda pendentes.

## Backend e segurança

Novas Functions em `southamerica-east1`:

| Function | Finalidade |
| --- | --- |
| `manageCommunication` | Callable autenticada; valida perfil ativo, claims, conteúdo, revisão e idempotência; salva rascunho ou coloca envio/agendamento na fila. |
| `startCommunicationDelivery` | Trigger do Firestore nomeado; inicia imediatamente comunicados na fila, em até cinco lotes de 100 registros por execução. |
| `dispatchCommunications` | Scheduler por minuto; busca até dez trabalhos vencidos/em progresso, processa até cinco lotes por trabalho e retoma progresso nos próximos ciclos. |
| `prepareAgencyLogoUpload` | Valida o administrador ativo no banco nomeado e a conta Auth; sincroniza a claim `admin` exigida pelo Storage, preservando outras claims. O cliente renova o ID token antes do upload. |

Lote, notificações e cursor são confirmados na mesma transação. O ID de entrega deriva do par comunicado/destinatário via SHA-256. Reexecução, retry e concorrência não recriam notificações nem zeram leitura/dispensa. Revisão impede sobrescrever edições concorrentes; conteúdo em envio/enviado é imutável pelo endpoint. Mesma requisição confirmada pode ser repetida após perda da resposta sem novo envio.

Permissões específicas: `admin=true` mais `appearanceEditor=true` e/ou `communicationsEditor=true`. Firestore/backend também conferem documento `admins/{uid}` ativo; claims sozinhas não dão acesso ao editor pelo Firestore. Equipe/clientes autorizados leem a aparência aplicada sem editar. Comunicados administrativos têm escrita direta pelo navegador negada. Cliente só lê notificações próprias; alteração de dispensa aceita apenas o campo/timestamp permitido.

Storage mantém o modelo existente de claims porque suas regras não consultam este Firestore nomeado. Os novos caminhos de imagens são imutáveis, sem atualização/exclusão pelo navegador; arquivos fora do limite ou SVG são recusados. Remover uma imagem da combinação/comunicado retira sua referência; não apaga o objeto que outro tema ou entrega pode estar usando. Arquivos abandonados podem exigir limpeza operacional posterior. URLs de download usam o modelo existente de links com token do Firebase; quem recebe e compartilha uma URL também pode compartilhar a imagem. As regras dos documentos não tornam esses links revogáveis por destinatário. Revogação de claims depende da renovação/expiração de tokens já emitidos, conforme limitação já documentada no projeto.

Rules alteradas:

- `firestore.rules`: coleções `appearance/active`, `appearance_designs` e `communications`; esquema/valores de aparência; dispensa restrita de pop-up. Notificações operacionais mantêm o caminho anterior de criação/leitura. O browser não pode criar `type=communication` pela regra de notificações.
- `storage.rules`: `agency/appearance/{fileName}` e `agency/communications/{fileName}` com permissão específica, MIME e limite de 2 MiB; logo existente passa a validar PNG/JPEG/WebP e limite de 5 MiB, com limpeza administrativa preservada.

Índices adicionados em `firestore.indexes.json`:

1. `communications`: `status ASC`, `scheduledAt ASC`.
2. `notifications`: `recipientUid ASC`, `type ASC`, `popup ASC`, `popupDismissedAt ASC`, `createdAt ASC`.

## Logotipo: correções e limite do diagnóstico

**O erro original em produção NÃO está confirmado como resolvido.** Não houve reprodução autenticada, leitura do estado remoto de Rules/claims/documentos, nem acesso a logs do navegador em produção nesta missão. O relatório anterior registra criação do arquivo com sucesso, mas não demonstra o resultado posterior de `getDownloadURL` e da escrita no Firestore. Um upload HTTP 200 não comprova persistência da configuração.

Inspecionado o fluxo completo: seletor → validação → Storage em `agency/logo/` → download URL → persistência em `agency_config/default` na instância compartilhada do banco nomeado → listener confirmado → projeção existente `agency_public`. A projeção assíncrona não é aguardada pelo formulário e não explica, sozinha, uma exceção de gravação capturada ali.

Correções locais verificáveis:

- A gravação do logo antes reenviava toda a configuração pelo serviço que valida configurações de pagamento. Agora chama atualização restrita a `{ logoUrl }` no **mesmo documento**, sem regravar dados alheios à identidade e sem depender de validação de outros campos. Nenhum código financeiro foi alterado. Documento ausente continua gerando erro explícito; não há criação cega de configuração paralela.
- Autorização Firestore de administrador e claim de Storage usam mecanismos diferentes. Nova callable valida o perfil real antes de sincronizar a claim já usada pelo projeto, preserva permissões existentes e força renovação do token. Isso cobre a divergência, mas **não prova que ela era a causa do incidente relatado**, especialmente quando o arquivo já havia sido criado.
- Diagnóstico mantém as etapas de validação/upload/URL/persistência e acrescenta `authorization`. Mais códigos conhecidos de Storage/Functions são preservados sem registrar erro bruto, credenciais ou URLs.
- Logo antigo permanece até confirmação. Limpeza continua limitada ao objeto da tentativa atual em falhas definitivas; falha ambígua de rede não apaga arquivo potencialmente confirmado.

### Como coletar `stage` e `code` com segurança

1. Durante uma tentativa legítima de atualização que apresente o erro, abrir as ferramentas do navegador (F12) → Console. Em homologação, pode-se reproduzir com um arquivo de teste; não foram feitos uploads experimentais em produção.
2. Ativar “Preservar registro/Preserve log” e filtrar por `agency_logo_failed`.
3. Expandir o objeto ao lado do evento e copiar **somente** `stage` e `code`, por exemplo `{ "stage": "persist", "code": "permission-denied" }`.
4. Não enviar URLs de download, query strings, token, cabeçalhos Authorization, arquivos HAR, objetos de usuário nem credenciais. Se não houver evento, informar apenas a mensagem exibida, horário e versão/deployment em uso.

Interpretação inicial: `authorization` = pré-autorização/renovação; `upload` = envio ao Storage; `url` = obtenção da URL após envio; `persist` = escrita no documento existente. O código ajuda a selecionar a próxima verificação, mas não deve ser interpretado como causa definitiva sem contexto.

## Validação

- TypeScript do frontend: aprovado, com escopo explícito de `src`, Vite e Vitest. O comando original incluía por varredura implícita o projeto separado `ts-financeiro` e falhava em dependências desse projeto; `tsconfig.json` agora delimita o app principal, sem alterar aquela pasta. Functions têm compilação própria.
- Build Vite: aprovado. Mantém aviso de bundle principal acima de 500 kB; imports dinâmicos do cliente Functions compartilham módulo já importado estaticamente pelo app. Sem biblioteca nova.
- Build TypeScript Functions: aprovado.
- Interface: oito arquivos e **26 testes aprovados** de aparência, pop-up, logotipo, persistência, notificações, layout móvel e Sidebar. Reexecução final dos dois arquivos de logo/persistência: **12 testes aprovados**, já incluídos nos 26, sem dupla contagem.
- Functions: três testes unitários de limites/normalização de destinatários, ID idempotente e elegibilidade.
- Emuladores Firestore/Storage: seis testes aprovados, sem falhas: permissão específica, formato/tamanho de imagem, agendamento/rascunho/revisão, autorização de logo/claims, isolamento/dispensa e envio concorrente idempotente.
- Primeira execução dos emuladores na restrição de rede não abriu a porta local; repetição autorizada fora da restrição passou. Primeira rodada paralela do Vitest teve falha de inicialização de worker e um mock incompatível, corrigido com import tardio. Rodada serial posterior passou. Esses resultados não são apresentados como falhas funcionais remanescentes.
- Sem testes em dados reais. Inspeção manual em navegador autenticado de homologação, tanto desktop quanto celular, continua necessária antes da publicação.

## Custos operacionais adicionais

Não há dependência nova nem assinatura de biblioteca. A ativação adiciona um job Cloud Scheduler por minuto, chamadas de Functions/trigger, leitura de fila no Firestore, leituras/transações de progresso, uma notificação gravada por destinatário e armazenamento/tráfego das imagens. O loop de Scheduler faz uma consulta por minuto mesmo sem envios; a cobrança efetiva depende do plano, franquias, região e volume. Envio em lotes limita uma execução, sem eliminar cobrança por destinatário. Confirmar faturamento habilitado e orçamento no projeto antes da publicação; não foi consultada nem alterada a conta de faturamento e não foi estimado um valor monetário sem esses dados.

## Etapas para publicação, não executadas

1. Revisar somente os arquivos desta missão e preservar os itens locais de checkout/Financeiro/CORS. Validar primeiro em homologação com usuários fictícios.
2. Executar `npm.cmd run lint`, `npm.cmd run build` e `npm.cmd --prefix functions run build`.
3. Publicar manualmente as Rules Firestore/Storage, os dois índices e **somente as quatro novas Functions listadas acima**, no projeto `gen-lang-client-0975642231`, mantendo o banco `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58`. Não selecionar todas as Functions; há alteração local preexistente no checkout que não pertence à missão.
4. Aguardar índices prontos e confirmar Scheduler/trigger ativos e permissões de serviço necessárias. Testar envio imediato, horário futuro, retry e dispensa em homologação com o navegador fechado durante o agendamento.
5. Conceder as permissões específicas apenas aos administradores escolhidos. Script preparado, **não executado**: `node functions/scripts/grant-editor-permissions.mjs <UID> <appearance|communications|both|revoke>`. Exige credencial administrativa do operador, verifica perfil ativo, preserva outras claims e revoga refresh tokens; renovar a sessão após a mudança. `revoke` remove as duas permissões específicas.
6. Publicar o frontend na Vercel após backend/Rules/índices compatíveis. A nova autorização do logotipo exige sua callable já publicada.
7. Validar visualmente o tema com uma conta admin, equipe e cliente em homologação; conferir histórico e isolamento entre destinatários; só depois aplicar a combinação global aprovada. Não agendar/enviar comunicados reais como teste.
8. Para o incidente do logo, manter a pendência até verificar o resultado de uma atualização legítima no ambiente afetado, com diagnóstico seguro em caso de falha. Não há comprovação remota nesta entrega.

## Arquivos da missão

Novos:

- `src/appearance/theme.ts`
- `src/appearance/appearance.service.ts`
- `src/appearance/AppearanceProvider.tsx`
- `src/appearance/AppearanceEditor.tsx`
- `src/appearance/ColorWheel.tsx`
- `src/appearance/useEditorPermission.ts`
- `src/communications/service.ts`
- `src/communications/CommunicationsPanel.tsx`
- `src/communications/AnnouncementPopup.tsx`
- `src/services/agency-logo-access.service.ts`
- `functions/src/communications.ts`
- `functions/src/agency-logo-access.ts`
- `functions/scripts/grant-editor-permissions.mjs`
- `functions/src/test/communications.test.ts`
- `src/test/appearance.test.tsx`
- `src/test/appearance-persistence.test.ts`
- `src/test/announcement-popup.test.tsx`
- `test/rules/appearance-communications.test.mjs`
- este relatório.

Alterados:

- `src/app/layouts/AuthenticatedLayout.tsx`
- `src/components/Sidebar.tsx`
- `src/components/AdminDashboard.tsx`
- `src/components/ClientDashboard.tsx`
- `src/components/FeedView.tsx` (somente classe visual do contêiner)
- `src/components/notifications/NotificationItem.tsx`
- `src/pages/admin/AdminSettingsPage.tsx`
- `src/pages/admin/AdminNotificationsPage.tsx`
- `src/data/repositories/agency-config.repository.ts`
- `src/hooks/useAgencyConfig.ts`
- `src/services/agency-logo.service.ts`
- `src/types.ts`
- `src/index.css`
- `src/test/agency-config-logo-persistence.test.ts`
- `src/test/agency-settings-logo.test.tsx`
- `functions/src/index.ts`
- `firestore.rules`
- `storage.rules`
- `firestore.indexes.json`
- `tsconfig.json`.

Preservados, fora da missão: modificação preexistente em `functions/src/mercado-pago-checkout.ts`, `cors.json` não rastreado e diretório `ts-financeiro/` não rastreado. Não foram executados comandos de stage/commit/push/deploy. Nenhuma alteração de contratos, cobranças, valores ou lógica de aprovação/publicação foi feita.

## Fechamento dos testes

**35 testes distintos aprovados**: 26 de interface/dados, três unitários das Functions e seis de segurança/integração em emuladores. Compilação frontend e Functions, TypeScript e verificação de sintaxe do script de permissões aprovados. `git diff --check` dos arquivos da missão passou; foi excluído dessa verificação o checkout modificado previamente, sem corrigir ou reformatar seu conteúdo.

Comandos de referência para repetir a validação:

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd --prefix functions run build
npm.cmd run test:run -- src/test/appearance.test.tsx src/test/appearance-persistence.test.ts src/test/announcement-popup.test.tsx src/test/agency-settings-logo.test.tsx src/test/agency-config-logo-persistence.test.ts src/test/notifications.test.tsx src/test/authenticated-layout-mobile.test.tsx src/test/sidebar-agency-logo.test.tsx --maxWorkers=1
node --test functions/lib/test/communications.test.js
firebase.cmd emulators:exec --only firestore,storage --project demo-ts-agency-rules "node --test test/rules/appearance-communications.test.mjs"
```

Pendências: publicação manual de backend/Rules/índices/frontend, concessão controlada de claims, homologação visual autenticada e confirmação do incidente de logo no ambiente afetado. Não há alegação de correção comprovada do logotipo em produção.
