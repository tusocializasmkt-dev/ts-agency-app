# Camada de acesso a dados

## 1. Objetivo

Separar renderização, lifecycle remoto, casos de uso e persistência sem alterar o comportamento do produto. O contrato de domínio continua centralizado em `src/types.ts`.

## 2. Fluxo component → hook → service → repository → Firebase

Componentes chamam hooks. Hooks mantêm loading, erro e lifecycle. Services expressam a intenção da interface. Repositories executam consultas e mutações. Apenas repositories e utilitários da camada de dados acessam Cloud Firestore.

```text
Component → Hook → Service → Repository → Firebase
                       ↓
                    Mapper
```

## 3. Responsabilidade de cada camada

- **Component:** renderização, interação e estado exclusivamente visual.
- **Hook:** dados remotos, loading, erro, comandos e cleanup.
- **Service:** caso de uso, composição e intenção de negócio.
- **Repository:** query, snapshot, leitura e escrita Firestore.
- **Mapper:** fronteira entre documento bruto e entidade do domínio.
- **Firebase data:** tipos internos, normalização de erros e utilitários compartilhados.

## 4. Estrutura de arquivos

```text
src/
├── data/
│   ├── firebase/
│   ├── mappers/
│   └── repositories/
├── services/
└── hooks/
```

Cada domínio possui somente os arquivos usados pela aplicação atual. Os arquivos `index.ts` são pontos de exportação e não contêm lógica.

## 5. Padrão de erros

Repositories convertem falhas desconhecidas em `PersistenceError`, que registra operação, entidade, código opcional e erro original. Detalhes internos não são usados como mensagem de interface. Hooks traduzem falhas para mensagens controladas e as expõem pelo campo `error`. Comandos rejeitam novamente para que componentes preservem seus toasts de sucesso ou falha.

## 6. Padrão de subscriptions

Repositories realtime retornam o `Unsubscribe` do Firestore. Todo hook retorna essa função diretamente no cleanup de `useEffect`, ou agrega os unsubscribes quando acompanha mais de uma coleção. Erros encerram o loading. Não há polling ou cache global.

## 7. Mappers e IDs

Mappers injetam `snapshot.id` nas entidades e não persistem o campo `id`. Fallbacks temporários aceitam nomes legados de links, posts, agendamento, feedback, boleto e promessa de pagamento somente durante a leitura. Novas escritas usam exclusivamente os nomes canônicos.

## 8. Timestamps

Repositories adicionam `serverTimestamp()` nas criações e atualizações que já possuíam esse comportamento. O domínio aceita `Timestamp | FieldValue` na fronteira de persistência. Datas de negócio continuam strings conforme o contrato atual.

## 9. Regras para novos repositories

- Conter somente operações de persistência.
- Normalizar todos os erros.
- Retornar unsubscribe em consultas realtime.
- Usar mapper para documentos retornados.
- Não expor snapshots aos componentes.
- Não duplicar IDs dentro dos documentos.

## 10. Regras para novos services

- Representar intenção real da interface.
- Compor operações quando necessário.
- Não importar componentes ou hooks.
- Não acessar diretamente o SDK Firebase.
- Não criar aliases sem agregar significado de caso de uso.

## 11. Regras para novos hooks

- Controlar loading, erro e cleanup.
- Usar somente services para dados.
- Manter dependências de efeitos primitivas e estáveis.
- Não exibir erros internos do Firebase.
- Não criar cache global ou polling implicitamente.

## 12. Acessos diretos ao Firebase ainda existentes

`src/contexts/AuthContext.tsx` continua usando Firebase Auth e duas leituras Firestore para identificar `admins/{uid}` ou `brands/{uid}`. Essa exceção foi mantida para evitar ampliar a missão para uma refatoração completa de identidade e autenticação. `src/lib/firebase.ts` permanece responsável apenas pela inicialização dos SDKs.

## 13. Pendências

- Criar futuramente um `identity.repository.ts` ao revisar integralmente autenticação.
- Decidir uma estratégia de remoção dos fallbacks legados após migração remota controlada.
- Avaliar índices compostos exigidos pelos filtros de marca, status e mês antes de publicar.
- Considerar operação atômica para restauração da lixeira em uma missão de confiabilidade.
- Conectar mensagens `error` dos hooks a estados visuais dedicados onde hoje o componente mantém apenas toast de comandos.
