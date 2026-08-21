# Roteamento e layouts

## 1. Objetivo

Substituir a navegação por estado local por URLs, deep links e proteção baseada na sessão e nos papéis existentes.

## 2. Mapa de rotas

O mapa canônico está centralizado em `src/app/router/routes.ts`. A raiz decide o destino pelo papel; `/login` e `/404` são públicas; `/admin/*` e `/cliente/*` usam layouts e guards próprios.

## 3. Rotas públicas

- `/login`: formulário existente e redirecionamento de usuário autenticado.
- `/404`: página não encontrada.
- `/`: redirecionamento inicial controlado.

## 4. Rotas administrativas

- `/admin`
- `/admin/clientes`
- `/admin/clientes/:brandId`
- `/admin/posts`
- `/admin/calendario`
- `/admin/financeiro`
- `/admin/metricas`
- `/admin/lixeira`
- `/admin/configuracoes`

## 5. Rotas do cliente

- `/cliente`
- `/cliente/posts`
- `/cliente/calendario`
- `/cliente/financeiro`
- `/cliente/metricas`
- `/cliente/perfil`
- `/cliente/vitrine`

## 6. ProtectedRoute

Espera o AuthContext, preserva a origem de uma rota protegida, redireciona visitantes para `/login` e apresenta o estado controlado quando o perfil não pode ser identificado.

## 7. RoleGuard

Permite somente `admin` na árvore `/admin` e `client` na árvore `/cliente`. Acesso incompatível é substituído pela raiz apropriada do papel autenticado. Nenhum papel é inferido.

## 8. RootRedirect

Redireciona visitantes para o login, administradores para `/admin` e clientes para `/cliente`, sempre com `replace` e sem loops.

## 9. Layouts

`PublicLayout` contém apenas o `Outlet`. `AdminLayout` e `ClientLayout` preservam a estrutura com Sidebar, área rolável e largura de conteúdo existente. Layouts não carregam dados.

## 10. Sidebar e navegação ativa

A Sidebar usa `NavLink`. O estado ativo deriva da URL, recebe `aria-current` do Router e também é indicado por peso tipográfico e fundo. Menus são separados por papel. Logout permanece um botão. Notificações não possuem link porque a funcionalidade não existe.

## 11. Deep links e refresh

Todas as rotas são declaradas diretamente no `BrowserRouter`, inclusive o detalhe por `brandId`. O servidor de desenvolvimento Vite suporta fallback da SPA. Em hospedagem futura, todas as URLs da aplicação deverão ser reescritas para `index.html`; essa configuração de hosting não faz parte desta missão.

## 12. Regras para novas rotas

- Adicionar primeiro a constante em `routes.ts`.
- Usar o layout e o guard do papel correto.
- Criar page wrapper fina e reutilizar componentes.
- Não consultar dados no Router ou layout.
- Não criar rota para funcionalidade inexistente.

## 13. Componentes legados removidos ou adaptados

`AdminDashboard` e `ClientDashboard` foram mantidos como composições leves das páginas iniciais. Seus props, switches e estados `activeTab` foram removidos. `Sidebar` deixou de receber estado de navegação. `App.tsx` agora apenas renderiza `AppRouter`.

## 14. Pendências

- Configurar rewrite para `index.html` no hosting futuro.
- Adicionar testes automatizados de guards, redirects e rotas diretas.
- Avaliar parâmetros ou query strings para persistir filtros administrativos entre páginas.
