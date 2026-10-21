# Falha ao salvar data/hora de publicação existente

Data: 21/10/2026.

## Causa e evidências

O problema foi reproduzido localmente com as regras atuais do repositório, sem alterar regras ou acessar dados de produção.

1. `/admin/posts` abre `FeedView`, que passa o post existente ao `PostModal`.
2. `mapPost` converte a ausência de `published` no documento em `published: false` para exibição.
3. O modal inicializa o formulário com o objeto inteiro. Ao mudar apenas data/hora, converte o valor local para ISO UTC e reenvia os outros campos, inclusive o `published: false` acrescentado na leitura.
4. `usePosts.update` chama `editPost`, que valida as mídias existentes (IDs, limite, capa, cliente e tipo), lê o post e encaminha a escrita ao repositório. O ramo preexistente de ressubmissão de posts rejeitados/com ajustes não foi alterado.
5. `updatePost` usa `toPostWriteData` e acrescenta `updatedAt: serverTimestamp()`. Antes da correção, o mapper também serializava os campos de publicação.
6. Acrescentar `published: false` onde o campo não existia é uma alteração para o Firestore. `validPublicationUpdate()` permite alterar campos de publicação apenas isoladamente, junto de `updatedAt`. Combinar essa alteração com `scheduledDate` resulta em `permission-denied`, mesmo para administrador.
7. `normalizeFirestoreError` envolve o erro em `PersistenceError`, preservando `originalError` e `code`, mas exibindo a mensagem genérica “Não foi possível concluir a operação de dados”. O hook relança esse erro e o modal mostra a mensagem.

O teste no emulador comprovou o bloqueio do payload anterior para admin, manager e social_media e o sucesso do payload corrigido. A captura de tela, isoladamente, não permite comprovar os campos do documento específico em produção; a reprodução confirma o defeito no código e nas regras locais.

## Correção

`toPostWriteData` exclui `published`, `publishedAt` e `publishedBy` das escritas de conteúdo. A ação dedicada `setPostPublished` continua responsável por esses campos. Isso também impede que um formulário aberto sobrescreva o estado de publicação alterado por outra operação.

Nenhuma conversão de data precisou ser alterada: em São Paulo, 28/10/2026 às 14h corresponde a `2026-10-28T17:00:00.000Z`. Também foi testada a virada do dia: 23h30 corresponde a 02h30 UTC do dia seguinte.

## Arquivos alterados nesta tarefa

- `src/data/mappers/post.mapper.ts`: única alteração de código de produção.
- `src/test/post-modal-media.test.tsx`: edição somente de data/hora com `published` ausente, falso e verdadeiro; preservação de legenda, mídia, ordem, capa, cliente, status e objetivo.
- `src/test/post-date.test.ts`: conversão explícita de São Paulo para UTC e retorno, inclusive virada do dia.
- `test/rules/post-publication.rules.test.mjs`: reprodução do bloqueio anterior e validação da correção em nove cenários de perfil/estado de publicação; compara todos os campos persistidos, exceto `updatedAt`.
- `vitest.config.ts`: inicia os testes no fuso `America/Sao_Paulo`, independentemente do fuso da máquina.
- Este relatório.

## Validação

- Testes direcionados: 7 arquivos e 34 testes aprovados.
  `npx.cmd vitest run src/test/post-modal-media.test.tsx src/test/post-date.test.ts src/test/post-media-mapper.test.ts src/test/post-media-service.test.ts src/test/repositories.test.ts src/test/feed-publication.test.tsx src/test/services.test.ts`
- Emulador Firestore: 5 testes aprovados, incluindo a regressão com nove cenários e os testes existentes de publicação/permissões. As recusas `PERMISSION_DENIED` dos casos negativos são esperadas.
- TypeScript: `npm.cmd run lint`, aprovado.
- Build: `npm.cmd run build`, aprovado, com avisos de tamanho de bundle e importação estática/dinâmica de `data/functions/client.ts`.
- Verificação de espaços do diff dos arquivos desta tarefa: aprovada.

## Limites e pendências

Não houve commit, push ou deploy. A confirmação manual do documento específico no site depende de disponibilizar a correção e repetir a edição no ambiente correspondente; isso não foi executado nesta tarefa. Caso o erro persista, coletar `PersistenceError.code`, `operation`, `entity` e `originalError`, a presença/valor dos campos de publicação e as regras efetivamente implantadas, sem divulgar tokens ou URLs privadas de mídia.

Nenhuma regra de Firestore/Storage, Function, autenticação, permissão ou estrutura de dados foi alterada. As alterações preexistentes em `functions/src/mercado-pago-checkout.ts`, `src/appearance/theme.ts`, `cors.json`, os arquivos de diagnóstico/aparência e `ts-financeiro/` foram preservadas. O projeto CRM TS Desenvolvimento não foi acessado nem alterado.
