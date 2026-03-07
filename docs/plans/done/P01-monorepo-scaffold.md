# P01 — Monorepo Scaffold

## Metadata
- **Depende de:** nenhum
- **Branch:** main
- **Worktree:** nao

## Objetivo
Criar a estrutura base do monorepo com pnpm workspaces, Turborepo, e pacotes compartilhados de configuracao (tsconfig e eslint).

## Arquivos a criar

```
multi-tenant-admin/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
├── .npmrc
├── apps/
│   ├── api/          (vazio, criado no P02)
│   └── admin/        (vazio, criado no P06)
├── packages/
│   ├── tsconfig/
│   │   ├── package.json
│   │   ├── base.json
│   │   ├── nestjs.json
│   │   └── react.json
│   └── eslint-config/
│       ├── package.json
│       └── index.js
```

## Passos de execucao

### Passo 1 — package.json raiz

```json
{
  "name": "multi-tenant-admin",
  "private": true,
  "packageManager": "pnpm@9.15.4",
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "lint": "turbo lint",
    "typecheck": "turbo typecheck",
    "clean": "turbo clean"
  },
  "devDependencies": {
    "turbo": "^2.3.0"
  }
}
```

### Passo 2 — pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

### Passo 3 — .npmrc

```
auto-install-peers=true
strict-peer-dependencies=false
```

### Passo 4 — turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": [".env"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "api:openapi": {
      "outputs": ["openapi.json"],
      "dependsOn": ["^build"]
    },
    "api:generate": {
      "dependsOn": ["api#api:openapi"],
      "outputs": ["src/api/generated/**"]
    }
  }
}
```

### Passo 5 — .env.example

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=admin_platform
DB_USER=postgres
DB_PASSWORD=

# JWT
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=1d

# API
API_PORT=3000
VITE_API_URL=http://localhost:3000/api/v1
```

### Passo 6 — .gitignore

```gitignore
# Dependencies
node_modules/

# Build
dist/
.turbo/

# Environment
.env
.env.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Generated
apps/admin/src/api/generated/

# Logs
*.log

# Coverage
coverage/
```

### Passo 7 — packages/tsconfig/package.json

```json
{
  "name": "@admin/tsconfig",
  "version": "0.0.0",
  "private": true,
  "files": [
    "base.json",
    "nestjs.json",
    "react.json"
  ]
}
```

### Passo 8 — packages/tsconfig/base.json

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "compilerOptions": {
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "exclude": ["node_modules", "dist"]
}
```

### Passo 9 — packages/tsconfig/nestjs.json

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "commonjs",
    "target": "ES2021",
    "lib": ["ES2021"],
    "outDir": "./dist",
    "rootDir": "./src",
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "incremental": true
  }
}
```

### Passo 10 — packages/tsconfig/react.json

```json
{
  "extends": "./base.json",
  "compilerOptions": {
    "module": "ESNext",
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "noEmit": true
  }
}
```

### Passo 11 — packages/eslint-config/package.json

```json
{
  "name": "@admin/eslint-config",
  "version": "0.0.0",
  "private": true,
  "main": "index.js",
  "dependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-prettier": "^5.0.0"
  },
  "peerDependencies": {
    "eslint": "^8.0.0 || ^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

### Passo 12 — packages/eslint-config/index.js

```js
module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  ignorePatterns: ['dist/', 'node_modules/', '*.js'],
};
```

### Passo 13 — Criar pastas vazias para apps

```bash
mkdir -p apps/api
mkdir -p apps/admin
```

### Passo 14 — Instalar dependencias

```bash
pnpm install
```

## Verificacao final

- [ ] `pnpm install` roda sem erros
- [ ] Estrutura de pastas esta correta: `apps/api`, `apps/admin`, `packages/tsconfig`, `packages/eslint-config`
- [ ] `pnpm turbo --version` retorna versao do turbo
- [ ] Arquivos de config do tsconfig existem e sao JSON valido

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P01 status `completed`, proximo -> P02
2. Mover este arquivo para `docs/plans/done/`
