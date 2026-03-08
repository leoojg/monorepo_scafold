# Design: Refresh Token Strategy

## Problema

O sistema atual usa apenas um JWT access token com expiração de 1 dia. Quando expira, o operador precisa fazer login novamente. Não há mecanismo de renovação silenciosa nem controle granular de sessões.

## Decisões

| Decisão | Escolha |
|---------|---------|
| Armazenamento backend | Tabela dedicada (`refresh_tokens`) no PostgreSQL |
| Entrega ao frontend | HttpOnly cookie (refresh) + body (access) |
| Rotação | A cada uso, com detecção de reuso |
| Expiração access token | 15 minutos |
| Expiração refresh token | 7 dias |
| Revogação em desativação | Revogar todos os refresh tokens do operador |
| Gestão de sessões | Básico: login, refresh, logout, logout-all |

## Arquitetura

### Fluxo de Tokens

```
Login → access token (body, 15min) + refresh token (HttpOnly cookie, 7d)
  ↓
Request autenticado → Bearer access token
  ↓
Access token expira → POST /auth/refresh (cookie automático)
  ↓
Novo access token (body) + novo refresh token (cookie) → antigo invalidado
  ↓
Refresh token expirado/reusado → 401 → redirect login
```

### Backend

#### Nova Entidade: `RefreshToken`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID, PK | Identificador único |
| `tokenHash` | string, indexed | SHA-256 do token (nunca armazena raw) |
| `operator` | ManyToOne → Operator | Dono do token |
| `family` | UUID | Agrupa tokens da mesma cadeia de rotação |
| `expiresAt` | Date | Quando o token expira |
| `usedAt` | Date, nullable | Marcado quando rotacionado |
| `revokedAt` | Date, nullable | Marcado quando revogado manualmente |
| `createdAt` | Date | Data de criação |

#### Endpoints

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| POST | `/auth/login` | (existente) agora também seta cookie | Não |
| POST | `/auth/refresh` | Rotaciona tokens | Não (usa cookie) |
| POST | `/auth/logout` | Revoga sessão atual | Sim |
| POST | `/auth/logout-all` | Revoga todas as sessões | Sim |

#### Detecção de Reuso

Quando um refresh token já marcado como `usedAt` é apresentado novamente, revoga toda a `family` (todos os tokens daquela cadeia). Isso indica que o token foi comprometido.

#### Revogação Automática

Quando `operator.isActive` muda para `false` ou `passwordHash` muda, revogar todos os refresh tokens do operador via hook no service de operators.

### Frontend

#### Axios Client

- Interceptor de resposta: ao receber 401, tenta `POST /auth/refresh` (cookie vai automaticamente)
- Se refresh sucede, repete o request original com novo access token
- Se refresh falha, redireciona para login
- Flag para evitar loop infinito de refresh

#### Auth Provider

- `login()` — armazena apenas o access token em localStorage (refresh vem como cookie)
- `logout()` — chama `POST /auth/logout`, limpa localStorage
- Refresh token cookie gerenciado pelo browser (HttpOnly, SameSite, Secure)

### Configuração

Novas variáveis de ambiente:

```
JWT_REFRESH_SECRET=change-me-in-production
JWT_REFRESH_EXPIRES_IN=7d
JWT_EXPIRES_IN=15m  # muda de 1d para 15m
```
