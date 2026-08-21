# Integração de mídias com posts

## 1. Objetivo

Relacionar posts a mídias da biblioteca para criação, edição e visualização, preservando posts antigos.

## 2. Modelo Post

`mediaIds` contém IDs únicos na ordem visual. `coverMediaId` deve pertencer à lista. O post não embute `MediaAsset`.

## 3. Compatibilidade legada

`mediaUrl` e `mediaUrls` continuam no contrato, mapper, blueprint e renderização. A prioridade é `mediaIds`, depois `mediaUrls`, depois `mediaUrl`.

## 4. Relação com MediaAsset

O service valida existência e pertencimento à mesma marca. A resolução para exibição ocorre em lote, fora do repository de posts.

## 5. MediaPicker

O seletor recebe `brandId`, consulta somente mídias `ready` da marca e confirma ou cancela sem alterar o formulário prematuramente.

## 6. Seleção múltipla

Permite até dez mídias, com indicação textual, visual e contador.

## 7. Ordem

Botões esquerda/direita alteram `mediaIds`; nenhuma biblioteca drag-and-drop foi instalada.

## 8. Capa

A primeira mídia é a capa padrão. O usuário pode escolher outra; remover a capa promove a primeira restante. O Feed começa pela capa sem alterar a ordem persistida.

## 9. Regras por tipo

Carrossel exige pelo menos duas mídias canônicas. Reels com seleção canônica exige ao menos um vídeo. Demais tipos usam regra genérica.

## 10. Criação

O admin escolhe cliente no Feed, preenche o post, seleciona mídias e salva `mediaIds` e `coverMediaId`. Não há upload no modal.

## 11. Edição

Posts canônicos recuperam seleção, ordem e capa. Posts legados mantêm preview e podem ser substituídos pela biblioteca sem migração em massa.

## 12. Feed

O Feed usa renderer próprio, resolve mídia canônica e preserva fallback legado e controles de aprovação existentes.

## 13. Vídeo

Vídeos usam player interno, controls, preload metadata e nunca autoplay.

## 14. Carrossel

Exibe uma mídia por vez, contador, indicadores textuais e botões anterior/próximo. Não possui autoplay.

## 15. Download

Cada mídia com URL HTTP/HTTPS pode ser aberta ou baixada individualmente. Não há ZIP ou proxy.

## 16. Cliente

O cliente visualiza, navega, baixa e mantém as decisões de aprovação existentes, sem criar ou editar posts.

## 17. Mídia excluída

Soft delete não impede resolução por ID. Posts existentes continuam exibindo a mídia enquanto o arquivo e metadata existirem.

## 18. Mídia ausente

IDs não encontrados geram placeholder controlado; o restante do post continua funcional.

## 19. Performance

IDs são consultados em chunks de dez, sem subscriptions individuais. Um cache simples reutiliza assets já resolvidos entre cards.

## 20. Testes

Mapper, validação, batch, picker, modal, feed, imagem, vídeo, carrossel, legado, ausência e cliente são testados sem Firebase real.

## 21. Pendências

O cache ainda não possui invalidação temporal. Regras locais precisam ser publicadas somente após revisão/autorização. Posts legados não são migrados automaticamente.

## 22. Próxima missão

Evoluir o fluxo de aprovação com feedback estruturado e histórico de decisão, ainda sem notificações.
