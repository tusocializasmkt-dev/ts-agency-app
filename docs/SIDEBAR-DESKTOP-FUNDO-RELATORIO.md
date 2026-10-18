# Sidebar desktop: continuidade e imagem de fundo

Entrega local em 18/10/2026. Sem commit, push, deploy, alteração de claims ou gravação em produção. A alteração local das Firestore Rules foi autorizada expressamente pelo usuário durante esta missão.

## Causa e correção desktop

A Sidebar usava `lg:sticky` dentro do layout com `overflow-x-hidden`. Esse overflow cria um contexto de rolagem que prende o sticky ao ancestral, em vez de acompanhar a rolagem efetiva da página. A altura de uma janela existia, mas o elemento inteiro saía da área visível em páginas longas; não era um problema de persistência da cor.

Reprodução no navegador local com o componente anterior e conteúdo de 5.000 px: janela de 720 px; após rolar 1.400 px, a Sidebar passou de `top=0` para `top=-1400`, com `bottom=-680`. A cor desaparecia porque o elemento saía da janela.

No desktop, a Sidebar agora usa posição fixa à janela, com altura `100dvh`. Um espaçador de 256 px, exibido apenas a partir de 1024 px, reserva sua largura e impede sobreposição ao conteúdo. A navegação mantém seu próprio `overflow-y-auto`; cabeçalho institucional e ações inferiores permanecem dentro da barra. Não foi alterado o comportamento dos botões/rotas.

Depois da correção, na mesma rolagem: `top=0`, `bottom=720`, `height=720`. Em janela de 480 px, a navegação interna apresentou altura de 264 px, conteúdo de 632 px e rolagem até 368 px, mantendo a Sidebar inteira na janela. Não houve rolagem horizontal no cenário verificado.

O cabeçalho mobile, dimensões, abertura/fechamento, restauração de foco, overlay e navegação mobile não foram alterados. Os novos estilos e a largura reservada só atuam no desktop. A imagem desktop não é aplicada ao drawer mobile.

## Editor e upload

A infraestrutura existente já oferecia upload de fundos em `agency/appearance/`. Foi reutilizada, sem novo Storage, serviço independente, Function ou permissão.

Na seção Aparência e Personalização, o grupo **Imagem de fundo do menu lateral** permite:

- Selecionar PNG, JPG/JPEG ou WebP de até 2 MiB e 16 megapixels.
- Decodificar/validar a imagem antes do envio; SVG, arquivo vazio, tipo/tamanho inválido e conteúdo não decodificável são rejeitados.
- Ver a imagem e a prévia da combinação antes de aplicar globalmente.
- Ajustar posição horizontal/vertical entre 0 e 100%, escala uniforme entre 100 e 200%, cor da sobreposição e opacidade entre 0 e 100%.
- Remover a imagem da combinação, voltando à cor sólida do menu.
- Salvar/carregar a imagem e seus ajustes na biblioteca existente de combinações.

O fundo usa `cover` em uma camada decorativa com escala uniforme, recortada pela própria Sidebar. Não distorce a proporção nem intercepta cliques. A camada cobre toda a altura, inclusive atrás das áreas institucionais e ações inferiores. Texto preto/branco é escolhido por luminância; a sobreposição pode ser reforçada automaticamente para manter contraste de 4,5:1 com os itens, mesmo se a opacidade solicitada for insuficiente. Essa proteção é indicada na interface. A cor normal das ações inferiores no desktop acompanha o contraste da superfície; o destaque vermelho no hover de saída permanece legível sobre o fundo claro existente. O mobile mantém seus estilos anteriores.

## Persistência e compatibilidade

O campo opcional `sidebar.desktopBackground` pertence ao mesmo documento de aparência aplicada e aos mesmos documentos da biblioteca existente:

```json
{
  "image": "URL permanente retornada pelo Firebase Storage",
  "positionX": 50,
  "positionY": 50,
  "scale": 100,
  "overlayColor": "#ffffffff",
  "overlay": 85
}
```

Os campos antigos `sidebar.color`, `image`, `position`, `scale` e `overlay` continuam presentes e com a mesma semântica. O mobile continua usando exclusivamente esses campos antigos. Combinações legadas, sem `desktopBackground`, continuam válidas e mantêm o fundo anterior. Ao editar os novos controles, apenas o campo específico de desktop é acrescentado/alterado.

Selecionar arquivo faz upload e altera apenas o rascunho/prévia; não publica o tema. A URL definitiva vem de `getDownloadURL`, nunca de `blob:`. **Salvar combinação** grava a biblioteca; **Aplicar globalmente** grava `appearance/active`. O listener existente observa confirmação do servidor e ignora escrita otimista pendente. Trocar combinações carrega seus dados completos; **Carregar original** seguido de aplicar remove o campo desktop e a imagem, restaurando os padrões.

Falha de upload não substitui o rascunho anterior. Falha de salvamento não altera a aparência global confirmada. Nenhum arquivo antigo é excluído, antes ou depois do salvamento, pois pode pertencer a outra combinação ainda em uso. Remover uma imagem retira a referência no tema, sem exclusão física. Arquivos de tentativas abandonadas podem exigir limpeza operacional posterior.

## Segurança e dependência de publicação

Somente `firestore.rules` foi alterado, **localmente e após autorização do usuário**. A validação passa a aceitar o objeto opcional exclusivamente em `sidebar`, com lista fechada de campos, URLs permanentes do caminho existente, cores válidas e limites numéricos. O cabeçalho não aceita essa extensão. Combinações antigas continuam aceitas.

Não houve mudança de autorização: continuam exigidos administrador ativo no Firestore, `admin=true` e `appearanceEditor=true`. A alteração não concede claims nem amplia leitura/escrita para equipe ou clientes. As Storage Rules existentes já protegem o caminho usado e foram preservadas. Autenticação, comunicados, pagamentos, Mercado Pago, dados de clientes, contratos e Functions não foram alterados. Não há índice novo.

**Pendente para ativação:** revisar/publicar manualmente a atualização de Firestore Rules antes do frontend que salva `desktopBackground`. Rules antigas rejeitarão esse novo campo; nesse caso a interface informa falha e mantém a configuração anterior. Não foi realizado deploy de Rules, frontend ou qualquer outro recurso nesta entrega. A autorização recebida cobre somente a alteração local, não a publicação.

## Validação

- **25 testes direcionados aprovados** em nove arquivos: editor, upload, validação do modelo, persistência, cabeçalho/menu mobile, identidade da Sidebar, equipe e badge de notificações.
- **Dois testes de Rules aprovados** nos emuladores, com dados fictícios: compatibilidade legada/nova, manutenção da autorização, bloqueio de URL temporária, valores inválidos, campos extras e configuração desktop indevida no cabeçalho. Total de 27 testes.
- TypeScript e build aprovados; mantidos os avisos existentes de tamanho de bundle e compartilhamento do cliente Functions entre imports estáticos/dinâmicos.
- Navegador Edge local com os componentes reais e dados de configuração fictícios: cor sólida, imagem personalizada, posicionamento/escala, página longa, rolagem interna, reidratação da configuração após recarregar, remoção para cor sólida e restauração do original. Autenticação/Firebase foram substituídos apenas no ambiente de teste visual; não houve acesso à sessão de produção.
- Mobile em **320, 375, 390 e 430 px**: oito capturas com menu aberto/fechado idênticas entre componente anterior e corrigido, com animações estabilizadas. Outras oito capturas permaneceram idênticas após configurar imagem exclusiva do desktop. Cabeçalho manteve 64 px em todas as larguras.
- A persistência Firebase foi coberta por testes de payload/listener e regras locais; o recarregamento visual usou estado fictício persistido na página de teste. Não é uma alegação de teste de gravação em produção.
- Verificação de whitespace dos arquivos da missão aprovada; alteração preexistente do checkout foi excluída dessa verificação e preservada.

## Arquivos modificados/criados

Alterados:

- `src/components/Sidebar.tsx`
- `src/appearance/theme.ts`
- `src/appearance/AppearanceEditor.tsx`
- `src/index.css`
- `src/test/appearance.test.tsx`
- `firestore.rules`

Criados:

- `src/appearance/SidebarBackgroundEditor.tsx`
- `src/test/sidebar-background-editor.test.tsx`
- `src/test/appearance-background-upload.test.ts`
- `test/rules/desktop-sidebar.rules.test.mjs`
- `docs/SIDEBAR-DESKTOP-FUNDO-RELATORIO.md`

Preservados os itens preexistentes, incluindo `functions/src/mercado-pago-checkout.ts`, `cors.json`, `ts-financeiro/`, o relatório anterior de permissões e seu teste. O projeto separado CRM TS Desenvolvimento não foi acessado.

Comandos principais executados:

```powershell
npm.cmd run test:run -- src/test/sidebar-background-editor.test.tsx src/test/appearance-background-upload.test.ts src/test/appearance.test.tsx src/test/appearance-persistence.test.ts src/test/authenticated-layout-mobile.test.tsx src/test/mobile-header.test.tsx src/test/sidebar-agency-logo.test.tsx src/test/sidebar-notification-badge.test.tsx src/test/sidebar-team-access.test.tsx --maxWorkers=1
npm.cmd run lint
npm.cmd run build
firebase.cmd emulators:exec --only firestore,storage --project demo-ts-agency-rules "node --test test/rules/desktop-sidebar.rules.test.mjs"
```
