# Logotipo: persist / not-found / removed

Investigação e correção local em 18/10/2026. Nenhuma gravação em produção, alteração de permissões, commit, push ou deploy.

## Diagnóstico

O evento informado identifica a falha na persistência, depois de o upload e `getDownloadURL` terminarem com sucesso. A operação nesse estágio era:

```ts
await updateDoc(configRef, { logoUrl });
```

`configRef` é `agency_config/default` na instância compartilhada `db`, inicializada por `getFirestore(app, firebaseConfig.firestoreDatabaseId)`. O destino é o projeto `gen-lang-client-0975642231`, banco `ai-studio-983a0c74-a073-4755-af2a-6e8c97248d58`. `default` é o ID do documento, não a seleção do banco `(default)`.

`updateDoc` exige um documento existente: a ausência de `agency_config/default` produz `not-found`. O código não provisionava esse documento no primeiro salvamento do logo. Se a leitura inicial recebe um documento ausente, o mapper gera erro e o hook encerra o carregamento mantendo sua configuração vazia; isso não cria o documento antes da tentativa de upload.

A sequência rastreada é:

1. `AdminSettingsPage` apresenta `AgencySettings`; o seletor chama `changeLogo` do hook existente.
2. A autorização existente ocorre antes de `uploadAgencyLogo`; sua falha teria `stage=authorization`.
3. O service envia um arquivo novo, com timestamp/UUID, para `agency/logo/`.
4. Obtém a URL e muda o estágio para `persist`.
5. Chama `updateAgencyLogoUrl`; a escrita exigindo documento existente podia rejeitar com `not-found`.
6. A rejeição é normalizada sem perder o código. `uploadAgencyLogo` considera essa rejeição definitiva e remove somente o objeto dessa tentativa. Isso explica `cleanup=removed`; a limpeza é consequência, não origem da falha.
7. O hook não executa a atualização visual de sucesso. O formulário abandona a prévia temporária e mantém o logo confirmado anteriormente.

O trigger `syncPublicAgency` é assíncrono e não é aguardado pelo upload; uma falha nele não gera essa rejeição no callback de persistência do navegador. Também não se trata de `storage/object-not-found`: o código informado é o `not-found` da escrita Firestore.

Limite: não houve leitura/reprodução autenticada do ambiente remoto. O registro identifica a operação e a condição de documento ausente tratada pela correção; apenas `stage`/`code`, sem a resposta completa, não excluem uma indisponibilidade/inexistência do próprio banco remoto. A seleção local do banco está correta. Se a nova escrita também receber `not-found`, o erro continuará explícito e será necessário verificar a existência do banco nomeado no ambiente afetado; não há fallback silencioso para outro banco ou documento.

## Correção

Somente a persistência do logo passou para:

```ts
await setDoc(configRef, { logoUrl }, { merge: true });
```

A mesma referência do mesmo banco continua sendo usada. O primeiro salvamento pode criar o documento com o campo de identidade; documentos existentes recebem apenas `logoUrl`, sem sobrescrita dos outros campos. Não foi alterada a operação geral de salvar configurações, nem código de pagamentos, autorização, Rules, Functions, comunicados ou aparência.

O service continua aguardando a confirmação da escrita antes de retornar sucesso. O listener existente observa mudanças de metadados e ignora snapshots com `hasPendingWrites`, evitando promover logo otimista a identidade confirmada. Rejeição definitiva preserva o logo anterior e limpa somente o novo objeto. Erro ambíguo de rede conserva o novo arquivo, pois a gravação pode já ter sido aceita no servidor.

## Regressão e validação

O teste de persistência passa pelo service real de upload e pelo repository real, com SDK/Storage substituídos para não tocar em produção. Ele cobre a condição em que `updateDoc` rejeitaria com `not-found`, verifica a gravação com mesclagem na referência do banco nomeado e garante que o novo arquivo não seja removido após sucesso.

Também cobre espera pela confirmação, rejeição definitiva com limpeza exclusiva da tentativa atual, falha ambígua sem exclusão, propagação de `not-found` sem troca de banco, e manutenção do listener que ignora escritas pendentes. A suíte existente do formulário verifica preservação do logo anterior e atualização visual somente depois da persistência.

Comandos executados:

```powershell
npm.cmd run test:run -- src/test/agency-config-logo-persistence.test.ts src/test/agency-settings-logo.test.tsx --maxWorkers=1
npm.cmd run lint
npm.cmd run build
```

Resultado: **17 testes aprovados** nos dois arquivos, TypeScript sem erros e build aprovado. O build mantém os avisos de bundle acima de 500 kB e de import dinâmico/estático compartilhado; nenhum deles impede a compilação. A validação é local, sem reprodução do incidente em produção.

## Arquivos desta correção

- `src/data/repositories/agency-config.repository.ts`: gravação com mesclagem restrita ao logo.
- `src/test/agency-config-logo-persistence.test.ts`: regressão e confirmação/limpeza de falhas.
- `docs/LOGOTIPO-PERSIST-NOT-FOUND.md`: diagnóstico e limites da validação.

Os demais arquivos analisados não precisaram ser modificados. Alterações preexistentes no checkout, `cors.json` e `ts-financeiro/` foram preservadas. A correção permanece local e precisa ser publicada manualmente no frontend para alcançar produção; não exige nova Rule ou Function.
