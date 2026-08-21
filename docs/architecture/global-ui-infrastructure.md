# Infraestrutura global de interface

## 1. Objetivo

Centralizar falhas inesperadas de renderização, feedback transitório e diálogos, preservando os fluxos e o design atuais.

## 2. Ordem dos providers

```text
AppErrorBoundary
└── AuthProvider
    └── ModalProvider
        └── FeedbackProvider
            └── App → AppRouter
```

O Error Boundary fica acima dos contexts para capturar falhas inesperadas na composição. Auth mantém sua responsabilidade existente. Modal e feedback ficam disponíveis para todas as páginas protegidas e públicas.

## 3. AppProviders

`AppProviders` compõe apenas infraestrutura global. Não contém Router, regra de negócio, Firestore ou subscriptions. `main.tsx` monta somente `StrictMode`, `AppProviders` e `App`.

## 4. ErrorBoundary

`AppErrorBoundary` é um class component tipado. Captura erros de renderização e ciclo de vida, registra um relatório seguro e mostra o fallback. Erros esperados de API, autenticação e rota continuam nos hooks e guards.

## 5. GlobalErrorFallback

Oferece tentativa de renderização novamente, retorno ao início e recarga completa como último recurso. Nenhuma stack trace ou mensagem interna é exibida.

## 6. Error reporting

`reportUnexpectedError` aceita `unknown` e registra localmente apenas nome e origem do erro quando a aplicação está em host de desenvolvimento. Não envia logs, tokens, dados pessoais ou mensagens para serviços externos. O arquivo contém o ponto de extensão para futura integração revisada de observabilidade.

## 7. FeedbackProvider

Encapsula `react-hot-toast` e expõe `success`, `error`, `warning`, `info`, `dismiss` e `dismissAll`. IDs determinísticos evitam duplicações óbvias. `FeedbackRegion` mantém o único `Toaster` da aplicação.

## 8. Diferença entre feedback e notificação de produto

Feedback é uma mensagem transitória sobre uma ação da interface e não é persistido. Notificação de produto teria modelo, destinatário, leitura e persistência; essa funcionalidade não foi criada.

## 9. ModalProvider

Mantém uma única camada ativa. Abrir um modal substitui o anterior de forma controlada. Confirmações retornam `Promise<boolean>`; promises pendentes são resolvidas como `false` ao fechar, substituir ou desmontar o provider.

## 10. GlobalModal

Usa portal em `document.body`, overlay, tamanhos controlados, título opcional, botão de fechar e opções de Escape/overlay. Bloqueia o scroll enquanto aberto e restaura foco e scroll ao fechar.

## 11. ConfirmDialog

Reutiliza `GlobalModal`, oferece variantes padrão e destrutiva, confirmação explícita e cancelamento. O foco inicial fica no botão de cancelar para reduzir confirmações acidentais.

## 12. Acessibilidade

Os diálogos usam `role="dialog"`, `aria-modal`, título associado, foco inicial, trap simples de Tab, Escape configurável, retorno de foco e labels nos botões. O overlay impede interação acidental com o fundo.

## 13. Padrão para novas mensagens

Componentes devem usar `useFeedback`, com títulos curtos e descrições opcionais. Erros internos não devem ser repassados. Imports diretos de `react-hot-toast` ficam restritos ao provider e à região visual.

## 14. Padrão para novas confirmações

Use `const confirmed = await confirm(options)`. A ação só continua quando o resultado é `true`. Operações destrutivas devem usar variante destrutiva, descrição e rótulo explícito.

## 15. Componentes migrados

`FeedView`, `FinanceView`, `TrashView`, `BrandDetail`, `AgencySettings`, `ClientProfile`, `LoginPage` e `InsightsView` usam `useFeedback`. A exclusão permanente da lixeira usa `useModal().confirm`.

## 16. Modais locais ainda existentes

`PostModal` permanece local porque possui formulário, preview e estado estreitamente ligados ao feed. Ele recebeu semântica de diálogo, Escape, overlay, foco, trap de Tab, restauração de foco e bloqueio de scroll. Os prompts textuais de feedback de post e promessa financeira permanecem locais/nativos até uma missão específica de formulários de diálogo.

## 17. Pendências

- Migrar prompts textuais para diálogos de formulário acessíveis sem mudar regras de produto.
- Avaliar migração completa do `PostModal` para o provider após separar seu estado de formulário.
- Adicionar testes de Error Boundary, confirmação, trap de foco e cleanup.
- Revisar uma futura integração de observabilidade com política de privacidade definida.
