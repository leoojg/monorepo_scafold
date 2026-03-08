# Design: CRUD Interfaces — Tenants, Companies, Users

**Data**: 2026-03-07
**Status**: Aprovado

## Contexto

O backend possui endpoints CRUD completos para tenants, companies e users. O frontend tem componentes de listagem, detalhe e formularios criados, porem:

- Formularios (TenantForm, CompanyForm, UserForm) nao estao integrados em nenhuma pagina
- Nenhuma operacao de mutacao (POST/PATCH/DELETE) esta implementada no frontend
- Sidebar aponta para `/companies` e `/users` (rotas inexistentes) — companies e users exigem tenant context (`/tenants/:tenantId/...`)
- Nao ha botoes de criar, editar ou desabilitar
- ConfirmDialog existe mas nao e utilizado

## Decisoes de Design

### Navegacao

- **Sidebar fixa**: Dashboard, Tenants, Activity
- **Sidebar contextual**: ao navegar para um tenant, aparecem sub-itens indentados (Companies, Users) com o nome do tenant visivel
- Remover links diretos `/companies` e `/users` da sidebar

### Tenants

| Acao | UX |
|------|-----|
| Listar | Tabela existente com search + paginacao |
| Criar | Botao "Novo Tenant" -> modal com formulario (nome, slug) |
| Editar | Clique na row -> navega para `/tenants/:id` (pagina de edicao) |
| Desabilitar | Dropdown na row -> "Desabilitar" com confirmacao. Tambem toggle na pagina de edicao |
| Dropdown | Gerenciar (navega para pagina), Desabilitar/Ativar (com confirmacao) |

**Pagina do tenant** (`/tenants/:id`): formulario de edicao (nome, slug, status active/suspended) com botao salvar. Sidebar contextual mostra links para Companies e Users.

### Companies (dentro de `/tenants/:tenantId/companies`)

| Acao | UX |
|------|-----|
| Listar | Tabela com search + paginacao |
| Criar | Botao "Nova Company" -> modal (nome, document) |
| Editar | Clique na row -> modal de edicao (nome, document, isActive) |
| Desabilitar | Dropdown -> "Desabilitar" com confirmacao. Tambem checkbox no modal de edicao |
| Dropdown | Editar, Desabilitar/Ativar |

### Users (dentro de `/tenants/:tenantId/users`)

| Acao | UX |
|------|-----|
| Listar | Tabela com search + paginacao |
| Criar | Botao "Novo User" -> modal (nome, email, senha, role) |
| Editar | Clique na row -> modal de edicao (nome, email, role, isActive). Sem campo de senha |
| Desabilitar | Dropdown -> "Desabilitar" com confirmacao. Tambem checkbox no modal de edicao |
| Dropdown | Editar, Desabilitar/Ativar |

## Padroes Tecnicos

- **Mutacoes**: `useMutation` do React Query com invalidacao de cache no sucesso
- **Confirmacao**: `ConfirmDialog` existente para acoes de desabilitar/ativar
- **API**: chamadas via `customInstance` (sem Orval por ora)
- **Formularios**: componentes de form existentes, integrados nos modais
- **Row clicavel**: `cursor-pointer` + hover visual na tabela
- **Feedback**: toast/mensagem de sucesso/erro apos mutacoes
- **Status simplificado**: tenants usam active/suspended (sem trial)
- **Coluna de acoes**: dropdown menu com icone "..." (tres pontos)

## Fora de Escopo

- Orval/code generation (API calls manuais por ora)
- Campo trial para status de tenants
- Delete permanente (apenas soft disable via isActive/status)
- Bulk operations
- Permissoes granulares
