# Auditoria consolidada das Missões 1 a 6

## 1. Escopo

Auditoria local da infraestrutura criada nas Missões 1–6: autenticação, modelo, dados, Router, providers, erros, modais, feedback, segurança, dependências, bundle e testes. Nenhum dado remoto, deploy, migração ou funcionalidade nova foi executado.

## 2. Estado atual da arquitetura

A direção predominante é `componente → hook → service → repository → Firebase`. Router, layouts e providers estão centralizados em `src/app`. Mappers isolam compatibilidade legada. Exceções justificadas: `AuthContext` consulta os perfis de identidade; Login, logout e Sidebar usam Firebase Auth diretamente. Não foram encontradas importações de repository/Firebase Firestore em páginas, layouts ou providers, nem ciclos evidentes nos barrels revisados.

## 3. Segurança

Não foram encontrados senha, token privado, administrador automático, papel inventado, `dangerouslySetInnerHTML`, `eval`, `innerHTML`, `localStorage`, `sessionStorage`, `alert` ou `window.confirm`. As variáveis `VITE_FIREBASE_*` representam configuração pública do cliente, não segredo administrativo. A negação padrão das rules está ativa. O `console.error` do login é restrito ao diagnóstico e o reporter só registra detalhes em desenvolvimento.

## 4. Modelo de dados

`src/types.ts`, mappers, repositories, blueprint, rules e contrato documentado estão alinhados nos nomes canônicos: `driveUrl`, `contractUrl`, `feed`, `scheduledDate`, `feedback`, `boletoUrl` e `promiseDate`. Aliases legados permanecem apenas na leitura. IDs vêm do snapshot e são removidos da escrita; `undefined` é removido pelos mappers de escrita. Não houve migração de documentos.

## 5. Camada de acesso a dados

Repositories concentram SDK Firestore, queries, mappers e normalização. Services delegam casos de uso sem importar Firebase. Hooks expõem loading, erro amigável, reset, comandos e cleanup. Foram corrigidas duas incompatibilidades entre writes de cliente e allowlists das rules: perfil da marca e status/feedback de post agora escrevem somente campos permitidos.

## 6. Router e layouts

Há um único `BrowserRouter`, rotas públicas, administrativas e de cliente, `RootRedirect`, `ProtectedRoute`, `RoleGuard`, layouts com `Outlet`, Sidebar baseada em `NavLink` e página 404 contextual. Testes validam loading, origem preservada, perfil inválido, papéis e destinos visíveis.

## 7. Providers globais

`AppProviders` compõe uma única instância de ErrorBoundary, AuthProvider, ModalProvider e FeedbackProvider; não cria Router nem acessa Firestore. O Toaster existe somente em `FeedbackRegion`. Os providers de modal/feedback são cobertos por testes comportamentais.

## 8. Erros

Repositories normalizam falhas com `normalizeFirestoreError`; hooks convertem falhas esperadas em mensagens amigáveis; o ErrorBoundary trata somente falhas inesperadas de render e não revela mensagem técnica ou stack. `reportUnexpectedError` preserva diagnóstico em desenvolvimento.

## 9. Modais e feedback

GlobalModal usa portal, `role="dialog"`, `aria-modal`, título associado, foco contido, Escape/overlay configuráveis, bloqueio/restauração de scroll e retorno de foco. Foi corrigido o conflito que sobrescrevia o foco inicial de Cancelar no ConfirmDialog. Persistem três `prompt` textuais, deliberadamente fora do escopo. Não há `alert` ou `window.confirm`.

## 10. Autenticação

O papel é obtido exclusivamente de `admins/{uid}` ou `brands/{uid}`; ausência de perfil bloqueia acesso. Logout limpa papel/brand no próximo evento. O listener retorna unsubscribe. Foi adicionada invalidação de consultas assíncronas antigas para impedir atualização após unmount e resposta obsoleta após troca rápida de usuário.

## 11. Firestore rules

As regras negam por padrão, distinguem admin/cliente, isolam posts, invoices e métricas por `brandId`, limitam perfil, status/feedback e promessa de pagamento, reservam lixeira/config para admin. Não há regra aberta. Os comentários antigos no helper `isAdmin` são imprecisos, mas a implementação usa a coleção `admins` com segurança; recomenda-se limpeza documental futura, sem efeito funcional.

## 12. Subscriptions e cleanup

Subscriptions `onSnapshot` retornam unsubscribe; hooks repassam ou compõem o cleanup. `onAuthStateChanged` é cancelado e respostas antigas são invalidadas. GlobalModal remove listener, restaura scroll/foco; ModalProvider resolve Promise pendente como `false` no fechamento, substituição e unmount. Testes cobrem esses caminhos.

## 13. Dependências

Foram instaladas apenas Vitest 4.1.10, Testing Library React 16.3.2, jest-dom 7.0.0, user-event 14.6.1 e jsdom 30.0.0. `npm audit` reportou 14 vulnerabilidades (2 low, 4 moderate, 7 high, 1 critical), principalmente transitivas em Firebase, GenAI, Vite/tooling e Express. Nenhum `audit fix` foi executado. O React Router requer solução upstream/versão segura compatível; a sugestão atual do npm usa `--force` e downgrade, portanto foi rejeitada.

## 14. Bundle

Build aprovado: CSS 34,56 kB (6,47 kB gzip) e JS 1.374,49 kB (384,75 kB gzip). O chunk único excede 500 kB. Principais candidatos por inventário: Firebase, Recharts, GenAI, motion/framer-motion e conjunto de páginas carregadas estaticamente. Próxima otimização deve lazy-loadar páginas administrativas/cliente e separar bibliotecas pesadas, após medição; nenhuma reestruturação foi feita nesta missão.

## 15. Testes criados

Configuração Vitest/jsdom com jest-dom e cleanup. Nove suítes, 40 testes aprovados: AuthContext; Router/guards/404; providers/modal/feedback; ErrorBoundary; mappers; repositories mockados; services; seis hooks; e fluxos integrados público/admin/cliente/feedback/modal. Todo Firebase foi mockado; nenhuma rede ou emulador foi usado.

## 16. Problemas encontrados

| ID | Severidade | Arquivo | Evidência e risco |
|---|---|---|---|
| M7-01 | Alta | `brands.repository.ts` | Cliente enviava `updatedAt`, fora da allowlist; perfil era rejeitado pelas rules. |
| M7-02 | Alta | `posts.repository.ts` | Mudança de status enviava `updatedAt`; aprovação/reprovação do cliente era rejeitada. |
| M7-03 | Média | `AuthContext.tsx` | Resposta assíncrona podia atualizar após unmount ou sobrescrever usuário novo. |
| M7-04 | Média | `GlobalModal.tsx` | Foco do contêiner sobrescrevia o `autoFocus` do Cancelar. |
| M7-05 | Alta | dependências | 14 advisories, incluindo 1 crítico transitivo. |
| M7-06 | Média | bundle | Chunk JS único de 1.374,49 kB minificado. |

## 17. Correções realizadas

Writes de cliente limitados aos campos aceitos; normalização preservada no status de post; proteção contra respostas antigas no AuthContext; foco inicial do modal preservado; infraestrutura e testes mínimos configurados. Nenhuma rule ou entidade foi alterada.

## 18. Riscos restantes

Vulnerabilidades transitivas exigem atualização coordenada e regressão. Bundle inicial grande afeta carregamento. Três prompts nativos permanecem. Rules não foram executadas em emulator; a validação foi estática e por contratos mockados. Não há cobertura numérica configurada.

## 19. Pendências técnicas

Planejar upgrades seguros por cadeia (`firebase`, `@google/genai`, Vite/plugin, Express e React Router); adicionar testes de rules com emulator em missão própria; medir code splitting; migrar os três prompts para UI acessível; revisar comentários obsoletos das rules. Não usar `--force` sem plano de compatibilidade.

## 20. Recomendação da próxima missão

Iniciar a fase funcional pela definição técnica do módulo de upload e biblioteca de mídias: contratos, autorização, limites, metadados, estratégia de Storage, estados e critérios de segurança. A implementação deve ocorrer somente depois dessa especificação e de uma decisão sobre os upgrades de segurança prioritários.
