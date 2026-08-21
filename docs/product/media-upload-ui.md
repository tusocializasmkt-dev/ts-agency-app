# Interface simples de upload de mídias

## 1. Objetivo

Permitir que administradores escolham um cliente, revisem arquivos e acompanhem uploads usando a fundação técnica de mídia.

## 2. Rota

`/admin/midias/upload`. Não existe rota de biblioteca em `/admin/midias`.

## 3. Permissão

A rota está dentro dos guards de autenticação e papel administrativo. Clientes são redirecionados para sua área.

## 4. Fluxo

Selecionar cliente, adicionar arquivos, revisar a fila, iniciar, acompanhar e então cancelar, tentar novamente ou remover concluídos.

## 5. Componentes

`MediaUploadPanel` compõe `MediaDropzone`, `UploadQueue`, `UploadQueueItem` e `MediaPreview` dentro da página administrativa.

## 6. Dropzone

Aceita clique, teclado, seleção múltipla e drag and drop local sem bibliotecas externas. O upload não começa ao selecionar.

## 7. Validação

Usa diretamente a validação e constantes do domínio. Nenhuma regra de MIME, tamanho ou quantidade foi duplicada na interface.

## 8. Fila

Itens permanecem visíveis em estados queued, uploading, completed, failed ou cancelled. Concluídos não são removidos automaticamente.

## 9. Progresso

Cada item e o lote possuem barras com percentuais fornecidos pelo hook e atributos acessíveis.

## 10. Cancelamento

Itens ativos oferecem cancelamento. Limpar uma fila ativa ou trocar de cliente usa o modal acessível e cancela operações antes da remoção.

## 11. Retry

Falhas e cancelamentos oferecem tentativa manual, reutilizando o item e o `mediaId` mantidos pelo hook.

## 12. Preview

Imagens usam preview local; vídeos usam controls, metadata e nunca autoplay. PDFs e demais arquivos têm ícones. Object URLs são sempre revogados.

## 13. Feedback

Lotes aceitos, rejeições, conclusão, falha, cancelamento, retry e ausência de marca usam `useFeedback`.

## 14. Responsividade

Controles usam áreas de toque adequadas, a fila empilha em telas pequenas e não exige overflow horizontal.

## 15. Acessibilidade

Dropzone operável por Enter/Espaço, input rotulado, foco visível, estados textuais, erros associados, previews nomeados e progressbars com valores ARIA.

## 16. Testes

Testes cobrem dropzone, fila, painel e rota admin/cliente com hooks mockados e sem Firebase real.

## 17. Fora do escopo

Biblioteca, busca, filtros, paginação, integração com posts, carrossel, compressão, thumbnails server-side e outros fluxos de arquivo.

## 18. Pendências

Não há bloqueio global ao fechar a aba ou navegar para outra rota. Esta proteção poderá ser estudada quando existir infraestrutura segura de navegação.

## 19. Próxima missão

Criar a biblioteca administrativa com listagem, filtros, paginação e preview, ainda sem integração com posts.
