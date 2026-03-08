# Design: Simplificação do Sidebar e Reordenação de Abas do Tenant

**Data:** 2026-03-08
**Status:** Aprovado

## Objetivo

1. Remover a mudança dinâmica do sidebar ao acessar um tenant
2. Reordenar as abas do tenant para: Companies → Users → Settings
3. Alterar a rota padrão do tenant para Companies

## Mudanças

### 1. Sidebar
- Remover sub-itens dinâmicos (Companies, Users) ao acessar tenant
- Remover chevron do item "Tenants"
- Remover hook `useTenantContext` do sidebar (se usado apenas para isso)
- "Tenants" volta a ser link simples para `/tenants`

### 2. Ordem das Abas
- De: Settings → Companies → Users
- Para: **Companies → Users → Settings**

### 3. Rota Padrão
- Rota index (`/tenants/$tenantId/index.tsx`) renderiza CompaniesListPage
- Settings ganha rota própria (`/tenants/$tenantId/settings`)

## Arquivos Impactados
1. `components/layout/sidebar.tsx` — remover sub-itens e chevron
2. `features/tenants/tenant-layout.tsx` — reordenar abas, ajustar rotas
3. `routes/_authenticated/tenants.$tenantId.index.tsx` — renderizar CompaniesListPage
4. Nova rota `routes/_authenticated/tenants.$tenantId.settings.tsx` — renderizar TenantSettingsPage
