# Fluxo de aprovação de conteúdo

## 1. Objetivo
Profissionalizar decisões do cliente e reenvios administrativos com rastreabilidade.

## 2. Status
São canônicos: `pending`, `approved`, `rejected`, `changes_requested` e `scheduled`.

## 3. Ações
O histórico registra `approved`, `rejected`, `changes_requested` e `resubmitted`.

## 4. Feedback
Aprovação limpa o feedback atual; reprovação e ajustes exigem texto aparado de 3 a 1000 caracteres.

## 5. Histórico
Cada entrada registra post, marca, transição, ação, feedback, autor, papel e data.

## 6. Persistência
O estado atual fica em `posts/{postId}` e a trilha em `posts/{postId}/history/{historyId}`. A subcoleção isola e simplifica a consulta por post.

## 7. Atomicidade
O post e seu evento são gravados no mesmo batch do Firestore.

## 8. Autoria
O UID e o papel vêm da sessão autenticada; nenhum nome ou dado sensível adicional é duplicado.

## 9. Reprovação
Somente posts pendentes podem ser reprovados e o motivo se torna o feedback atual.

## 10. Ajustes
Somente posts pendentes podem mudar para `changes_requested`, com instrução obrigatória.

## 11. Aprovação
A ação é direta, somente para post pendente, e limpa feedback anterior.

## 12. Resubmissão
Qualquer edição salva pelo admin em post reprovado ou em ajustes retorna a `pending`, limpa feedback e registra `resubmitted`.

## 13. Cliente
Visualiza e decide somente posts da própria marca; não edita post nem histórico.

## 14. Admin
Visualiza o mesmo histórico e cria reenvio ao salvar uma edição elegível.

## 15. Regras Firestore
As regras locais validam marca, autor, papel e ações permitidas; histórico é imutável para todos.

## 16. Compatibilidade legada
Um post antigo `pending` com feedback não vazio é lido como `changes_requested`; nenhum evento retroativo é inventado.

## 17. Performance
A assinatura ordenada por `createdAt` decrescente só começa ao expandir o histórico e é encerrada no cleanup.

## 18. Erros
Falhas preservam o estado remoto, mantêm o diálogo aberto e mostram mensagem amigável sem expor Firebase.

## 19. Acessibilidade
Diálogos têm rótulo de campo, erro anunciado, contador, foco modal e controles desabilitados durante processamento.

## 20. Testes
A suíte cobre contratos de serviço, feedback, reenvio, diálogo e integração existente, além de lint e build.

## 21. Pendências
Publicar as regras somente após o processo local de testes com emulador e revisão operacional.

## 22. Próxima missão
Implementar o sistema interno de notificações automáticas e manuais consumindo os eventos estruturados desta missão.
