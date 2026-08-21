# Núcleo real de faturas

## 1. Objetivo
Operar faturas internas sem checkout ou pagamento eletrônico.
## 2. Invoice
Obrigação financeira por marca, com descrição, valor, moeda, datas, Pix, boleto, promessa e autoria.
## 3. Status
Pending, overdue derivado, paid, suspended e cancelled.
## 4. Status efetivo
Pending vencida aparece overdue sem escrita automática no banco.
## 5. Datas
Datas civis usam `YYYY-MM-DD` e são validadas também quanto à existência real no calendário; auditoria usa Timestamp do servidor.
## 6. Valor
Permanece decimal validado com até duas casas; migração futura para cents deve ser planejada antes de pagamentos reais.
## 7. Pix
Chave, tipo e link HTTP/HTTPS podem ser definidos por fatura.
## 8. Boleto
Novo boleto é PDF em MediaAsset com categoria `invoice`; `boletoUrl` permanece fallback legado.
## 9. InvoiceHistory
Subcoleção imutável registra mudanças relevantes, ator e data.
## 10. PaymentPromise
Contém data solicitada, justificativa, revisão e resultado; não altera o vencimento original.
## 11. Regra dos 15 dias
Somente fatura overdue aceita data entre hoje e vencimento + 15 dias, sem promessa pendente.
## 12. Admin
Cria, edita somente descrição, valor, vencimento, competência e dados Pix, marca paga, suspende, retoma, cancela, troca boleto e revisa promessas. Status e timestamps não podem ser alterados pelo fluxo genérico de edição.
## 13. Cliente
Lê somente a própria marca, copia Pix, abre links seguros, baixa boleto e solicita promessa elegível.
## 14. Regras
Admin gerencia Invoice pelo Client SDK; cliente não escreve Invoice ou histórico diretamente. A promessa é validada e persistida por Callable Function com Admin SDK; exclusão física continua negada.
## 15. Segurança
Histórico é imutável, links são validados e Firestore/Storage permanecem fora dos componentes.
## 16. Notificações
Criação, pagamento manual e revisão avisam o cliente; solicitação cliente→admin aguarda backend confiável.
## 17. Compatibilidade legada
Mapper aceita `pdfUrl`, `boletoUrl`, `promiseDate`, `date` e `description` antigos.
## 18. Testes
Domínio, services, batches dos repositories, dialogs e telas são validados sem Firebase real.
## 19. Limitações
Não há checkout, provider, baixa automática, boleto bancário ou Pix eletrônico.
## 20. Próxima missão
Backend confiável para pagamentos e notificações cliente→admin, ainda sem credenciais reais.
