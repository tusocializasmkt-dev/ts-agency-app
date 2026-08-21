# Proposta de regras para mídia no Storage

Documento de proposta; não publicado.

- Restringir `brands/{brandId}/media/{mediaId}/{fileName}` a usuários autenticados autorizados para a marca.
- Permitir somente MIME e tamanho compatíveis com os limites do módulo.
- Bloquear escrita fora do caminho canônico e impedir listagem transversal entre marcas.
- Exigir validação equivalente no backend. A validação local é apenas feedback antecipado.
- Definir exclusão administrativa e manter o vínculo entre `mediaId`, metadados e caminho.

Antes da publicação, as regras precisam ser compatibilizadas com os claims e o modelo de associação de usuários a marcas.
