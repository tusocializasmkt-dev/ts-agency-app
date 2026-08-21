# Sistema interno de notificações

## 1. Objetivo
Centralizar avisos persistidos dentro do aplicativo.
## 2. Notification
Registra destinatário, tipo, título, mensagem, link interno, entidade, leitura, origem e datas.
## 3. Tipos
Suporta cinco eventos de posts e notificações manuais.
## 4. Destinatários
Criação e ressubmissão destinam-se ao cliente; decisões do cliente destinam-se aos admins.
## 5. Persistência
Usa a coleção top-level `notifications` para consulta global por destinatário.
## 6. Segurança
Cliente lê somente registros próprios e não altera conteúdo.
## 7. Regras
Somente admin cria; leitura é isolada; atualização limita-se à primeira gravação de `readAt`; exclusão é negada.
## 8. Eventos automáticos
O service de posts tenta criar o aviso somente depois que a operação principal termina.
## 9. Manual
Admin envia para cliente específico, sem rich text ou URL externa.
## 10. Repository
Centraliza consultas limitadas, criação, leitura individual e batch de leitura coletiva.
## 11. Service
Define destinatários, mensagens e links; componentes não montam mensagens de domínio.
## 12. Hook
Usa o UID da sessão e entrega lista, contagem, loading, erro e comandos.
## 13. Badge
Oculto em zero, numérico até 99 e `99+` acima disso.
## 14. Central
Admin e cliente possuem rotas protegidas próprias; o admin também possui envio manual.
## 15. Deep links
Somente rotas internas explicitamente permitidas são aceitas e a navegação usa React Router.
## 16. Lida/não lida
Uma notificação somente transita de não lida para lida.
## 17. Responsividade
Lista, cabeçalho e diálogo adaptam-se a telas menores.
## 18. Acessibilidade
Há lista semântica, texto “Não lida”, badge rotulado, foco modal e botões acessíveis.
## 19. Testes
Testes unitários cobrem contratos centrais sem Firebase real.
## 20. Emulator
Não há configuração de Emulator no projeto; regras não foram publicadas e exigem validação dedicada antes disso.
## 21. Limitações
A página inicial limita-se a 50 registros e não possui paginação completa.
## 22. Pendências
Eventos cliente→admin precisam de executor confiável para respeitar a proibição de criação pelo cliente; no frontend atual, falhas são controladas sem reverter a decisão.
## 23. Próxima missão
Evoluir o módulo financeiro para faturas, Pix, boleto e promessa de pagamento estruturada.
