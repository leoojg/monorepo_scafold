# Design — Planos de Execução do Admin Multi-Tenant

## Data: 2026-03-06

## Contexto

O projeto é um monorepo multi-tenant admin com NestJS (backend), React (frontend), MikroORM + PostgreSQL (database), e Orval (geração de client API). O `architecture-guide.md` define toda a arquitetura, entidades, DTOs, e estrutura.

## Decisões

### Abordagem híbrida de planos
- **Fundação (P01–P06):** planos por camada técnica, executados sequencialmente na `main`
- **Features (P07–P10):** planos verticais (backend + frontend + testes), executados em paralelo via worktrees

### Formato dos planos
- Cada plano é um arquivo markdown auto-contido em `docs/plans/`
- Inclui código completo inline (não depende do architecture-guide para execução)
- Testes embutidos em cada plano (TDD: RED → GREEN → REFACTOR)

### Política de arquivamento
- Planos completados são movidos para `docs/plans/done/`
- `PROGRESS.md` é sempre atualizado com status e próximo plano

### Grafo de dependências

```
P01 → P02 → P03 → P04 → P05 → P06
                                  ↓
                    ┌─────┬───────┼───────┐
                    P07   P08    P09     P10
```

P07–P10 são totalmente independentes entre si.

## Planos

| # | Nome | Fase | Branch |
|---|------|------|--------|
| P01 | Monorepo Scaffold | Fundação | main |
| P02 | Backend Base | Fundação | main |
| P03 | Database + Entidades | Fundação | main |
| P04 | Auth Module | Fundação | main |
| P05 | Audit Infrastructure | Fundação | main |
| P06 | Frontend Base | Fundação | main |
| P07 | Tenants CRUD | Feature | feat/tenants-crud |
| P08 | Companies CRUD | Feature | feat/companies-crud |
| P09 | Users CRUD | Feature | feat/users-crud |
| P10 | Activity Log | Feature | feat/activity-log |
