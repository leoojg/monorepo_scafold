# Progress Tracker

## Fase 1 — Fundacao (sequencial na main)

| Plano | Status | Depende de | Branch | Notas |
|-------|--------|------------|--------|-------|
| P01 - Monorepo Scaffold | completed | — | main | |
| P02 - Backend Base | completed | P01 | main | |
| P03 - Database + Entidades | pending | P02 | main | |
| P04 - Auth Module | pending | P03 | main | |
| P05 - Audit Infrastructure | pending | P04 | main | |
| P06 - Frontend Base | pending | P05 | main | |

## Fase 2 — Features Verticais (paralelo em worktrees)

| Plano | Status | Depende de | Branch | Notas |
|-------|--------|------------|--------|-------|
| P07 - Tenants CRUD | pending | P06 | feat/tenants-crud | |
| P08 - Companies CRUD | pending | P06 | feat/companies-crud | |
| P09 - Users CRUD | pending | P06 | feat/users-crud | |
| P10 - Activity Log | pending | P06 | feat/activity-log | |

## Status possiveis
- `pending` — aguardando execucao
- `in_progress` — em execucao
- `completed` — finalizado e mergeado
- `blocked` — bloqueado (ver notas)

## Proximo plano
-> **P03 - Database + Entidades**

## Politica de arquivamento
Ao finalizar um plano:
1. Atualizar status para `completed` nesta tabela
2. Mover o arquivo do plano para `docs/plans/done/`
3. Atualizar o campo "Proximo plano" acima
4. (Se worktree) Merge na main e limpar worktree
