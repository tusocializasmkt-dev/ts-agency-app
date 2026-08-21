# Segredos de pagamentos

## O que é segredo
Access Token, Client Secret, chaves privadas, credenciais de webhook e qualquer token de pagamento.

## Onde ficarão
Firebase Secret Manager, vinculados somente às Functions que realmente precisarem deles e separados por ambiente.

## Onde nunca podem ficar
React, variáveis `VITE_*`, Firestore, Storage, logs, commits, documentação, screenshots ou payloads de erro.

## Sandbox e production
Sandbox deve usar credenciais próprias e de menor privilégio. Production permanece desabilitado até revisão independente.

## Rotação e revogação
Rotacionar periodicamente, após suspeita de exposição e na mudança de operadores. Revogar primeiro a credencial comprometida, cadastrar nova versão e validar antes de remover versões antigas.

## Menor privilégio
Cada Function recebe apenas os secrets necessários. Operadores não devem compartilhar tokens por chat ou arquivos locais versionados.
