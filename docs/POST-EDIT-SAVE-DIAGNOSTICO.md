# Investigação do salvamento geral de posts existentes

Data: 21/10/2026. Continuação do diagnóstico de edição de data/hora.

## Resultado e limite da conclusão

A causa da falha atual em produção ainda não foi confirmada. Não foi aplicada uma nova mudança de payload, validação ou permissão baseada em hipótese. Foi corrigida a ausência de diagnóstico no formulário, para identificar a operação e o código exatos da próxima falha.

A causa identificada anteriormente (`published: false` acrescentado a documentos sem o campo) não explica, por si só, a falha atual: a correção já está presente no JavaScript público consultado em produção.

## Evidências obtidas antes da alteração de código de produção

- O HTML público de `/admin/posts` carrega `assets/index-B2HE4unK.js`. Esse arquivo contém o mapper que remove `published`, `publishedAt` e `publishedBy` das escritas de conteúdo; a função de atualização usa esse mapper. O formulário de `assets/FeedView-C_9oRDZf.js` encaminha a edição ao hook, como no código local.
- Consulta somente de leitura ao Firebase Rules confirmou que as regras implantadas no banco `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58` são exatamente iguais a `firestore.rules`. Release consultada: `cloud.firestore/ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58`; ruleset `4d01b2bb-28d6-4658-8665-379c13cc9176`; atualização em `2026-10-18T04:40:00.657895Z`.
- Consulta somente de leitura de uma amostra de 20 posts mostrou campos com os tipos esperados: legenda/data/cliente como strings, IDs de mídia como arrays, timestamps como timestamps. A saída do diagnóstico omitiu legendas, URLs, IDs de clientes e credenciais. A amostra não representa todos os documentos nem identifica o post específico que falha.
- No emulador com as mesmas regras, edições de legenda e data passam com o mapper atual para administrador, gerente e social media, com publicação ausente, falsa ou verdadeira: 18 cenários. O payload anterior continua recebendo `permission-denied` nos casos com o campo ausente, comprovando também que a regressão anterior está coberta.
- Não há sessão autenticada do site disponível nas superfícies de navegador conectadas a esta conversa. Nenhuma edição foi tentada em dados de produção. A sessão do CLI usada para consultas administrativas não equivale à sessão do navegador do usuário.

## Fluxo completo e pontos de falha

1. `AdminPostsPage` abre `FeedView`; o post selecionado passa ao `PostModal`.
2. `mapPost` normaliza tipo legado, data legada, feedback, status e listas de mídia. Os timestamps recebidos do SDK permanecem timestamps.
3. O formulário inicializa com o post inteiro. A legenda muda apenas `caption`; a data local passa por `localPostDateTimeToISOString`. O envio acrescenta cliente, IDs de mídia selecionados e capa.
4. `FeedView` verifica cliente e chama `usePosts.update`. O hook fornece o UID e papel atuais, captura a exceção, atualiza o erro da lista e relança a mesma exceção.
5. `editPost` valida as mídias quando o payload contém `mediaIds`: duplicidade, limite, capa, existência, cliente, carrossel e reels. Essa etapa pode chamar `loadMediaByIds`, que usa cache e, quando necessário, consulta `media` via `getMediaByIds`.
6. O serviço lê o post com `getPostById`. Posts rejeitados/com ajustes usam o ramo existente de ressubmissão, com escrita em lote do post e histórico. Os demais usam `updatePost`.
7. `toPostWriteData` retira `id` e os três campos de publicação, normaliza IDs/capa e remove `undefined` de primeiro nível. `updatePost` acrescenta `updatedAt: serverTimestamp()` e, quando aplicável, remove a capa antiga com `deleteField()`.
8. As regras exigem administrador ativo ou equipe com acesso à marca, preservação de `brandId`, tipos/status/mídias válidos e coerência de publicação/aprovação. Histórico de ressubmissão tem validação adicional de autor, papel e estados anterior/novo. Não foi encontrada justificativa para relaxar nenhuma dessas regras.
9. `normalizeFirestoreError` produz a mensagem “Não foi possível concluir a operação de dados.” e preserva `operation`, `entity`, `code` e `originalError` em `PersistenceError`. Antes desta tarefa, o hook e o modal tratavam o erro sem qualquer `console.error`, explicando o Console vazio. Isso não prova em qual chamada a falha de produção ocorreu.

As operações que podem resultar na mesma mensagem durante uma edição são:

| Entidade/operação | Significado |
| --- | --- |
| `media/get-by-ids` | Consulta das mídias antes da escrita |
| `post/get` | Leitura atual do post |
| `post/update` | Serialização/envio/aceitação da atualização |
| `post-history/commit-decision` | Escrita em lote de ressubmissão e histórico |

Erros de validação de mídia e de autor têm mensagens próprias. Notificações de ressubmissão têm falhas capturadas separadamente e não invalidam a escrita principal. Status HTTP 200 de transporte do Firestore, sem a exceção do SDK, não identifica o resultado dessas etapas.

## Alterações desta tarefa

- `src/components/Admin/PostModal.tsx`: registra `post_save_failed` apenas para `PersistenceError`, com `operation`, `entity` e `code`. Não registra payload, legenda, URLs, credenciais ou `originalError`. Mensagem e comportamento do formulário permanecem iguais.
- `src/test/post-edit-flow.test.tsx`: integração do formulário com serviço, mapper, repositório e normalizador reais, substituindo a fronteira do SDK e a consulta de mídias. Cobre legenda, data com virada de dia em São Paulo, timestamps reais do SDK e preservação dos demais campos. Injeta falhas distintas nas etapas e verifica o diagnóstico sem exposição de conteúdo.
- `src/test/post-modal-media.test.tsx`: amplia a regressão existente para legenda e data, com três estados de publicação.
- `test/rules/post-publication.rules.test.mjs`: amplia a regressão para 18 cenários de legenda/data no emulador.
- Este relatório. O relatório anterior foi preservado como registro da primeira investigação.

## Validação executada

- 8 arquivos, 43 testes direcionados aprovados: 37 nos testes de modal/mídia/data/repositórios/publicação/serviços e 6 na nova integração do fluxo de edição.
- 5 testes de regras aprovados no emulador, incluindo os 18 cenários de legenda/data. As recusas dos testes negativos são esperadas.
- `npm.cmd run lint`: aprovado (`tsc --noEmit`).
- `npm.cmd run build`: aprovado. Avisos de bundle acima de 500 kB e importações estáticas/dinâmicas de `src/data/functions/client.ts`; não impedem o build.
- `git diff --check` nos arquivos rastreados desta tarefa e verificação sintática do teste de regras: aprovados.

Comandos de testes executados:

```text
npx.cmd vitest run src/test/post-modal-media.test.tsx src/test/post-date.test.ts src/test/post-media-mapper.test.ts src/test/post-media-service.test.ts src/test/repositories.test.ts src/test/feed-publication.test.tsx src/test/services.test.ts
npx.cmd vitest run src/test/post-edit-flow.test.tsx
firebase.cmd emulators:exec --only firestore --project demo-ts-publication "node --test test/rules/post-publication.rules.test.mjs"
```

## Pendência para concluir a correção funcional

É necessário capturar a exceção da tentativa real que falha, particularmente `entity`, `operation`, `code` e, se necessário, a descrição de `originalError` sem conteúdo privado. O novo evento `post_save_failed` fornece os três primeiros dados quando esta versão for executada. Também é possível obtê-los pausando o depurador no `catch` do formulário na versão atual. Um Console vazio e requisições de transporte 200/canceladas não permitem distinguir essas operações.

Não houve commit, push ou deploy. Nenhuma regra, Function, pagamento, autenticação, permissão, estrutura de dados ou configuração de produção foi modificada. As alterações preexistentes em `functions/src/mercado-pago-checkout.ts`, `cors.json`, os arquivos de aparência e `ts-financeiro/` foram preservadas. O CRM TS Desenvolvimento não foi acessado.
