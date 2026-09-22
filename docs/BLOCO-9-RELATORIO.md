# Bloco 9 — experiência de uso em produção

Workspace exclusivo: `C:\Users\samsung\OneDrive\Desktop\ts-agency-app`. Base encontrada: `121bcbb`. O workspace estava limpo no início. Não foram reabertos autenticação, gestão de acessos ou IAM do Bloco 8E.

## Diagnóstico e solução dos cinco itens

| Item | Diagnóstico / causa no código | Solução local |
| --- | --- | --- |
| Refresh e URL direta | SPA Vite com BrowserRouter, rotas carregadas por lazy e ausência de `vercel.json`/fallback no repositório. O servidor precisa entregar o documento SPA para caminhos que não correspondem a arquivos. Isso explica o 404 da Vercel informado pelo usuário. | Criado rewrite para `/index.html`, sem redirect ou troca da URL. O filesystem tem precedência, preservando os assets existentes. Router, providers e guards permanecem intactos. Configuração remota não foi consultada; confirmar o resultado depois da publicação. |
| Download | `useFileDownload` já era compartilhado, mas seu catch chamava `window.open`: qualquer falha de fetch/CORS podia virar abertura de aba. O object URL também era liberado imediatamente. | Hook reutilizado com serviço compartilhado: fetch com validação HTTP, gravação em stream quando File System Access está disponível; fallback Blob com nome sanitizado e liberação posterior. Falhas são propagadas ao feedback e nunca viram abertura de aba. |
| Feed/mobile | O Feed forçava contêiner quadrado, embora o carrossel já usasse contain. A biblioteca e o seletor usavam cover, que corta imagens. Não há width/height persistidos no modelo MediaAsset. | Feed usa tamanho intrínseco da mídia, contain e altura máxima de 65vh, sem impor proporção Instagram. Biblioteca/seletor usam contain. Legenda mantém quebras de linha e quebra palavras extensas; a versão completa aparece no viewer. Calendário também deixa de impor aspect-video ao carrossel compartilhado. |
| Visualização ampliada | Existiam GlobalModal, carrossel e detalhes da biblioteca/calendário, mas não um viewer de post do Feed com zoom e legenda completa. | PostViewer reutiliza GlobalModal e as mídias já resolvidas pelo carrossel. Imagem inteira, zoom de 100% a 300%, reset, rolagem para detalhes, vídeo com controles/playsInline, navegação de carrossel, data/rede e legenda completa. Escape, foco e bloqueio do scroll vêm do modal existente. Viewer usa lazy import e só carrega ao abrir. No calendário não se abre um segundo modal sobre o modal existente. |
| Meus Clientes | O clique principal chamava `clientDetailFor`; o filtro de Feed existia somente no estado local. | Clique/Enter/Espaço abre `/admin/posts?brandId=...`. O filtro reside na URL, inclusive após refresh com sessão válida. Admin mantém ação secundária “Informações”. Equipe recebe Feed somente para marcas permitidas e não ganha ação administrativa. |

Referência do rewrite: [Vite na Vercel](https://vercel.com/docs/frameworks/frontend/vite). A configuração segue o fallback SPA documentado; não é redirect para a raiz. Gravação direta: [showSaveFilePicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showSaveFilePicker).

## Download e limites

URLs cross-origin são transferidas por fetch e não dependem do atributo download aplicado diretamente à URL externa. URLs inválidas, HTTP sem sucesso e falhas CORS/rede produzem erro. A ação “Abrir” da biblioteca permanece separada.

Em navegadores compatíveis, a escolha do destino ocorre no gesto de clique, seguida de stream direto para disco. Nos demais, o fallback é limitado aos 100 MiB já definidos em `MAX_MEDIA_FILE_SIZE_BYTES`, inclusive quando Content-Length não existe. Arquivos legados maiores exigem navegador com gravação em stream; o fallback os rejeita para não consumir memória sem limite. Nenhum limite de upload foi alterado.

O helper também é usado pelo botão de baixar boleto: ele herda a transferência correta, sem qualquer alteração no componente financeiro, pagamentos ou regras financeiras. Downloads reais continuam dependendo da disponibilidade da URL e da política CORS do servidor. Não foram feitas alterações no bucket ou no CORS remoto.

## Segurança e preservação

- AdminPostsPage impede montar o Feed quando uma marca da URL não pertence ao `brandIds` da Equipe.
- `usePosts` mantém sua proteção anterior, sem iniciar consulta não autorizada, e mantém consultas restritas quando não há filtro. Isso foi testado separadamente.
- `useBrands`, guards, Rules, status comercial e accessEnabled não foram alterados.
- Portal do Cliente não mudou de rota ou permissões. Seus componentes de mídia compartilhados recebem os ajustes visuais/download.
- Imports lazy de páginas permanecem; o viewer ganhou seu próprio chunk. Sem novas dependências.
- A restauração de última rota do Bloco 8E não foi modificada. Ela continua salvando pathname; o filtro da marca permanece durante refresh/acesso direto com sessão válida, mas não foi acrescentado ao histórico de última rota do Bloco 8E.

## Arquivos alterados/criados

Configuração e documentação:

- `vercel.json` (novo)
- `docs/BLOCO-9-RELATORIO.md` (novo)

Frontend:

- `src/services/file-download.ts` (novo)
- `src/hooks/useFileDownload.ts`
- `src/components/Admin/ClientList.tsx`
- `src/pages/admin/AdminClientsPage.tsx`
- `src/pages/admin/AdminPostsPage.tsx`
- `src/components/FeedView.tsx`
- `src/components/CalendarView.tsx`
- `src/components/media/PostMediaCarousel.tsx`
- `src/components/media/PostViewer.tsx` (novo)
- `src/components/media/MediaCard.tsx`
- `src/components/media/MediaPicker.tsx`

Testes:

- `src/test/file-download.test.tsx`
- `src/test/post-media-carousel.test.tsx`
- `src/test/block9-navigation.test.tsx` (novo)
- `src/test/block9-brand-scope.test.tsx` (novo)
- `src/test/post-viewer.test.tsx` (novo)

## Validações executadas

Primeira rodada: **10 arquivos / 54 testes aprovados**.

```powershell
npm.cmd run test:run -- src/test/block9-navigation.test.tsx src/test/post-viewer.test.tsx src/test/file-download.test.tsx src/test/post-media-carousel.test.tsx src/test/router.test.tsx src/test/media-library.test.tsx src/test/media-card-details.test.tsx src/test/media-picker.test.tsx src/test/feed-post-media-client.test.tsx src/test/sidebar-team-access.test.tsx
```

Rodada complementar, com os últimos ajustes do carrossel e testes adicionais: **4 arquivos / 16 testes aprovados**. Há sobreposição entre as rodadas; não são 70 testes distintos.

```powershell
npm.cmd run test:run -- src/test/block9-brand-scope.test.tsx src/test/file-download.test.tsx src/test/post-media-carousel.test.tsx src/test/client-calendar-readonly.test.tsx
```

As rodadas cobrem filtro/URL, navegação por teclado, informações do Admin, marca não autorizada, restrição de consultas, blob/stream, erros HTTP/CORS, limites com/sem Content-Length, viewer, zoom/reset, vídeo, legenda, fechamento e modal, além de regressões de biblioteca, guards e portal do Cliente. Testes DOM não comprovam aparência em dispositivos reais.

Suíte completa não executada: foram priorizados testes direcionados conforme solicitado. Não foram executados testes/deploys Firebase, pois não há mudança backend ou Rules.

Validações finais:

- `npx.cmd tsc --noEmit`: aprovado, sem erros.
- `npm.cmd run build`: aprovado em 35,20 segundos. Aviso de chunk maior que 500 kB; build não falhou. Páginas continuam separadas e o novo `PostViewer` gerou chunk próprio de aproximadamente 2,03 kB (0,97 kB gzip).
- `git diff --check`: aprovado, sem erros de whitespace. Avisos de conversão LF/CRLF do Git não são falhas dessa validação.
- `git diff --stat` e status revisados; sem arquivos staged. Novos arquivos não aparecem no stat padrão até serem adicionados, mas estão incluídos na lista deste relatório.

## Publicação e verificação manual

| Área | Alterada? |
| --- | --- |
| Firebase Functions | Não |
| Firestore Rules | Não |
| Storage Rules | Não |
| firebase.json | Não |
| vercel.json | Sim, novo fallback SPA |
| Firebase IAM | Não |

Publicar, após autorização, **somente as alterações locais pelo fluxo Git/Vercel do projeto `ts-agency-app`**, incluindo o novo vercel.json e o frontend. Nenhum comando Firebase é necessário.

Depois da publicação autorizada, validar:

1. F5 e URL direta em `/admin/financeiro`, `/admin/administradores` e `/admin/posts?brandId=...`; URL deve permanecer, assets carregar e guards continuar ativos.
2. Admin e Equipe: abrir Feed pela lista, voltar, trocar marca, tentar marca não autorizada; Admin mantém Informações. Cliente mantém seu portal.
3. Imagem e vídeo reais do Storage em Chrome/Edge e Safari/iOS/Android: download com nome correto, cancelamento do seletor, falha de rede e arquivo próximo do limite. A política CORS real não foi verificada nem modificada nesta missão.
4. Feed, biblioteca e calendário em mobile e desktop: mídia vertical, horizontal, quadrada, carrossel e vídeo. Verificar legenda, zoom com rolagem, reset, Escape, foco e fechamento.

Nenhum deploy, gcloud, git add, commit ou push foi executado. Nenhuma produção foi alterada. O workspace proibido não foi acessado.
