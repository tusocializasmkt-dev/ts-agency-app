# Fundação do módulo de mídia

## 1. Estrutura criada

O módulo foi separado entre domínio (`src/media`), mappers, repositories, service e hooks. Não há UI ou integração com posts.

## 2. Tipos

Os contratos cobrem asset, tipo, categoria, status, origem, item/estado/progresso de upload, validação e filtros.

## 3. MediaAsset

O ID é o ID do documento e nunca é persistido no corpo. O contrato contém identificação da marca, dados essenciais do arquivo, caminho, URL opcional, estado e timestamps.

## 4. Path strategy

O caminho canônico é `brands/{brandId}/media/{mediaId}/{nome-sanitizado}`. IDs aceitam somente segmentos seguros; o `mediaId` impede colisão baseada apenas no nome.

## 5. Validation

MIME e extensão são validados juntos, além de arquivo vazio, nome, tamanho individual, total e quantidade. Regras de Storage/backend continuam obrigatórias.

## 6. Errors

`MediaError` expõe códigos estáveis e mensagens amigáveis; erros crus do Firebase ficam encapsulados.

## 7. Media repository

Fornece subscription limitada e filtrada por marca, leitura protegida por marca, criação, atualização, delete lógico, restore e exclusão permanente.

## 8. Storage repository

Encapsula referência, upload resumível, progresso, cancelamento, URL, metadados e exclusão sem React.

## 9. Media service

Valida, prepara o contrato, coordena metadados/Storage e oferece operações de ciclo de vida.

## 10. useMediaLibrary

Expõe itens filtrados, loading, erro, filtros, refresh, delete e restore, sempre com cleanup da subscription.

## 11. useMediaUpload

Expõe itens, estado global, enqueue, start, cancel, retry, limpeza, progresso total e erro.

## 12. Concurrency

Fila FIFO com no máximo três uploads simultâneos.

## 13. Cancellation

Itens em fila são encerrados localmente; itens ativos cancelam a task. A completion sempre resolve ou rejeita.

## 14. Retry

Não há retry automático. Retry manual reutiliza `mediaId` e item, evitando documento duplicado.

## 15. Consistency

O fluxo cria `pending`, envia, obtém URL e marca `ready`; falhas marcam `failed`.

## 16. Cleanup

Se a escrita final falhar após o upload, o service tenta excluir o arquivo. Falha no cleanup vira `orphaned-file`.

## 17. Rules drafts

As propostas estão em `docs/security`; nenhuma regra ativa foi alterada ou publicada.

## 18. Tests

Testes unitários usam mocks e cobrem validação, paths, mapper, repositories, service e hook de upload sem Firebase real.

## 19. Pendências

A especificação `docs/product/media-upload-and-library-specification.md` da Missão 8 não estava presente. Os limites e o contrato devem ser reconciliados quando ela for recuperada. Regras ainda precisam de revisão/autorização.

## 20. Próxima missão

Criar somente a interface simples de upload com progresso, cancelamento e feedback, ainda sem biblioteca completa.
