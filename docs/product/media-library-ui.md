# Biblioteca administrativa de mídias

## 1. Objetivo

Permitir que administradores encontrem, visualizem e organizem mídias enviadas por cliente.

## 2. Rota

Página principal em `/admin/midias`; o upload permanece em `/admin/midias/upload`.

## 3. Permissões

Ambas as rotas estão protegidas por autenticação e papel administrativo. Clientes são redirecionados.

## 4. Estrutura

A página compõe filtros, grid, cards, paginação, detalhes, skeleton e estados vazios em componentes separados.

## 5. Filtros

Cliente, tipo e status usam valores canônicos. O contrato atual aceita somente imagem e vídeo, por isso documentos não aparecem como tipo inventado.

## 6. Busca

A busca considera nome original e armazenado somente dentro do lote atual de 24 itens. Não há busca textual server-side.

## 7. Ordenação

Mais recentes e mais antigos usam Firestore. Nome e tamanho são ordenados localmente dentro da página carregada.

## 8. Paginação

Usa cursor por ID, `startAfter` e limite de 25 documentos para entregar 24 e detectar a próxima página. O hook mantém uma pilha local para voltar.

## 9. Grid

Grade organizada de uma a quatro colunas, sem layout Pinterest ou overflow horizontal.

## 10. Card

Mostra preview, nome, cliente, tipo, tamanho, data, status e ações contextuais.

## 11. Preview

Imagens usam lazy loading. Vídeos usam metadata, sem autoplay. Tipos sem preview recebem representação segura.

## 12. Detalhes

O modal global mostra nomes, cliente, MIME, tamanho, status, datas, origem e preview, sem expor o path do Storage.

## 13. Soft delete

Mover para a lixeira exige confirmação, atualiza metadados e preserva o arquivo físico.

## 14. Restore

Restaura o registro para `ready` sem reenviar o arquivo.

## 15. Permanent delete

Bloqueada na interface enquanto não houver verificação segura de uso por posts. A operação técnica permanece no service, mas não é oferecida silenciosamente.

## 16. Empty states

Há estados específicos para biblioteca vazia, resultado de filtros e lixeira vazia.

## 17. Loading

Skeleton responsivo substitui spinner central.

## 18. Error

Erros são amigáveis e oferecem nova tentativa, sem mensagens cruas do Firebase.

## 19. Responsividade

Filtros, cards, modal e paginação se adaptam a telas menores, com nomes truncados e controles utilizáveis.

## 20. Acessibilidade

Filtros rotulados, cards e botões nomeados, status textual, foco visível, paginação semântica, previews descritos e modal global com foco, Escape e scroll lock.

## 21. Performance

Paginação limita a consulta; imagens são lazy e vídeos não são pré-carregados além de metadata. Consultas de cliente específico sempre incluem `brandId`.

## 22. Testes

Testes unitários e de integração usam mocks, cobrem estados e comandos e não acessam Firebase real.

## 23. Fora do escopo

Integração com posts, PostModal, carrossel, edição de metadata, galeria do cliente, tags e workflows avançados.

## 24. Pendências

Definir verificação de referências antes da exclusão permanente e avaliar busca server-side. URLs de download atuais podem ser duradouras e compartilháveis; a estratégia não foi alterada nesta missão.

## 25. Próxima missão

Integrar a biblioteca à criação e edição de posts, com múltiplas mídias e capa, sem workflows avançados.
