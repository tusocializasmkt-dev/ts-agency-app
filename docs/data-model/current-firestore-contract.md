# Contrato atual do Firestore

## 1. Objetivo

Este documento registra o contrato canônico atualmente consumido pelo frontend. Ele alinha nomes, tipos, enums, vínculos e timestamps entre TypeScript, blueprint, regras e componentes. Não representa uma migração já executada no Firestore.

## 2. Coleções atuais

| Coleção | Entidade | ID do documento |
| --- | --- | --- |
| `admins` | `AdminProfile` | UID do Firebase Auth |
| `agency_config` | `AgencyConfig` | ID fixo `default` |
| `brands` | `Brand` | UID do cliente no Firebase Auth |
| `posts` | `Post` | Gerado pelo Firestore |
| `posts/{postId}/history` | `PostDecisionHistory` | Gerado pelo Firestore |
| `notifications` | `Notification` | Gerado pelo Firestore |
| `invoices` | `Invoice` | Gerado pelo Firestore |
| `payments` | `Payment` | Gerado pelo backend futuro |
| `payments/{paymentId}/attempts` | `PaymentAttempt` | Gerado pelo backend futuro |
| `payments/{paymentId}/events` | `PaymentEvent` | Gerado pelo backend futuro |
| `payment_provider_config` | `PaymentProviderConfig` | ID fixo `default` |
| `metrics_organic` | `OrganicMetrics` | Gerado pelo Firestore |
| `metrics_paid` | `PaidMetrics` | Gerado pelo Firestore |
| `trash_items` | `TrashItem` | Gerado pelo Firestore |

O histórico de decisões usa `posts/{postId}/history`; notificações internas usam a coleção top-level `notifications`.

## 3. Entidades canônicas

- `AdminProfile`: perfil que concede o papel administrativo a um UID já provisionado.
- `AgencyConfig`: identidade e contatos globais da agência.
- `Brand`: cadastro da marca vinculada a um cliente.
- `Post`: conteúdo, agendamento e decisão atual de aprovação.
- `PostDecisionHistory`: decisão ou reenvio auditável, com transição e autor.
- `Notification`: aviso interno persistido e isolado por destinatário.
- `PaymentPromise`: promessa opcional embutida em uma fatura.
- `Invoice`: cobrança vinculada a uma marca.
- `OrganicMetrics` e `PaidMetrics`: séries mensais exibidas em gráficos e cards.
- `TrashItem`: cópia de um post mantida para restauração ou exclusão manual.

## 4. Campos obrigatórios e opcionais

| Entidade | Obrigatórios | Opcionais |
| --- | --- | --- |
| `AdminProfile` | `email`, `role` | `createdAt`, `updatedAt` |
| `AgencyConfig` | `name`, `logoUrl`, `phone`, `email`, `socialLinks` | `createdAt`, `updatedAt` |
| `Brand` | `name`, `cnpj`, `responsible`, `phone`, `status`, `website`, `login`, `socialLinks` | `email`, `logoUrl`, `driveUrl`, `contractUrl`, timestamps |
| `Post` | `brandId`, `type`, `socialNetwork`, `caption`, `scheduledDate`, `status` | `objective`, `mediaUrl`, `mediaUrls`, `feedback`, timestamps |
| `PostDecisionHistory` | `postId`, `brandId`, `action`, `previousStatus`, `newStatus`, `actorUid`, `actorRole`, `createdAt` | `feedback` |
| `PaymentPromise` | `promiseDate`, `description`, `status` | nenhum |
| `Invoice` | `brandId`, `amount`, `dueDate`, `status` | `boletoUrl`, `pixKey`, `paymentPromise`, timestamps |
| Métricas | `brandId`, `month` e todos os números exibidos | timestamps |
| `TrashItem` | mesmos campos obrigatórios de `Post` | campos opcionais de `Post`, `sourceCollection`, `deletedAt` |

O campo `id` das interfaces representa o ID do documento e não precisa ser duplicado no conteúdo persistido.

## 5. Papéis

Os únicos papéis são `admin` e `client`. `AdminProfile.role` aceita apenas `admin`. O papel de cliente resulta do vínculo entre o UID autenticado e `brands/{uid}`.

## 6. Status de post

O conjunto canônico é `pending`, `approved`, `rejected`, `changes_requested` e `scheduled`. Posts legados `pending` com feedback são interpretados como `changes_requested`. As ações históricas são `approved`, `rejected`, `changes_requested` e `resubmitted`.

## 7. Status financeiro

Faturas usam `pending`, `overdue`, `paid`, `suspended` e `cancelled`. Payments usam contrato independente: `created`, `pending`, `processing`, `approved`, `rejected`, `cancelled`, `expired` e `refunded`. Promessas de pagamento permanecem separadas e usam `pending`, `approved` e `rejected`.

## 8. Timestamps

`createdAt`, `updatedAt` e `deletedAt` são `Timestamp` do Firestore. Durante uma escrita, o frontend também aceita o `FieldValue` retornado por `serverTimestamp()`. Datas de negócio permanecem strings: `scheduledDate` e `promiseDate` em ISO 8601, `dueDate` como data civil e `month` no formato `YYYY-MM`.

## 9. IDs

Todos os IDs são strings no frontend. `AdminProfile` e `Brand` usam o UID do Firebase Auth como ID do documento. Posts, faturas, métricas e itens da lixeira usam IDs gerados pelo Firestore. O frontend injeta o ID do snapshot na interface e não exige um campo `id` redundante persistido.

## 10. Regras de vínculo por brandId

`Post`, `Invoice`, `OrganicMetrics`, `PaidMetrics` e `TrashItem` pertencem a uma marca por `brandId`. Para clientes, o valor deve corresponder ao UID autenticado. Administradores são identificados pela existência de `admins/{uid}`.

## 11. Inconsistências resolvidas

- `post` foi normalizado para `feed`; `reels` e `stories` preservam os rótulos usados pela interface.
- `scheduledAt` tornou-se `scheduledDate`.
- `rejectionComment` tornou-se `feedback`.
- `googleDriveLink` e `contractLink` tornaram-se `driveUrl` e `contractUrl`.
- `pdfUrl` tornou-se `boletoUrl` e `paymentPromise.date` tornou-se `promiseDate`.
- `MetricOrganic` e `MetricPaid` tornaram-se `OrganicMetrics` e `PaidMetrics`.
- Timestamps deixaram de usar `any` no domínio.
- O modelo de notificação interno foi reintroduzido com destinatário por UID e links internos permitidos.
- A alegação de expiração automática da lixeira foi removida da interface.

## 12. Pendências que exigem decisão de produto

- Definir uma migração controlada para documentos remotos que ainda usem nomes anteriores.
- Revisar `Brand.login`, que permanece no contrato por compatibilidade, mas não é lido pela interface atual; a autenticação usa o email do Firebase Auth e o UID.
- Definir se os timestamps opcionais serão preenchidos de maneira uniforme em todas as gravações; hoje apenas parte dos fluxos os escreve.
- Decidir se nome e CNPJ poderão ser editados pelo cliente; as regras atuais não permitem.
- Definir se `scheduled` é apenas estado visual ou parte de um processo automático futuro.
- Definir quando e por quem promessas de pagamento serão aprovadas ou rejeitadas.
- Definir como `sourceCollection` e `deletedAt` serão preenchidos quando o envio à lixeira for implementado.
- Decidir quando aplicar integralmente as funções de validação existentes nas regras, após avaliar documentos legados.

## 13. Itens não implementados

Não fazem parte do contrato atual: notificações, versões de conteúdo, histórico de aprovação, ativos de mídia, memberships e tickets de suporte. Também não existem upload, publicação em redes sociais, TTL da lixeira, importação de métricas ou formulário de criação de faturas.
