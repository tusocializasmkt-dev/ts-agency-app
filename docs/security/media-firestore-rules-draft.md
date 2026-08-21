# Proposta de regras Firestore para mídia

Documento de proposta; não publicado.

- A coleção futura é `/media/{mediaId}`.
- Leitura exige usuário autenticado e acesso ao `brandId` do documento.
- Criação exige `brandId` autorizado, status inicial `pending`, campos canônicos e ausência de `id` no corpo.
- Atualizações devem preservar `brandId`, `storagePath`, autoria e campos imutáveis.
- Transições de status permitidas devem ser explicitadas; exclusão lógica usa `deleted` e `deletedAt`.
- Exclusão permanente deve ficar restrita ao papel administrativo.

Os helpers de autorização existentes precisam ser revisados antes de transformar esta proposta em regra ativa.
