# i18n Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add internationalization (English + Portuguese) to the admin platform with structured error codes from the API.

**Architecture:** react-i18next with namespace-per-feature translation files, i18next-browser-languagedetector for automatic language detection, shadcn/ui DropdownMenu for UserMenu. Backend adds ErrorCode enum to API error responses, documented via Swagger for Orval type generation.

**Tech Stack:** i18next, react-i18next, i18next-browser-languagedetector, shadcn/ui DropdownMenu, NestJS @nestjs/swagger

---

## Task 1: Backend — ErrorCode Enum

**Files:**
- Modify: `apps/api/src/common/enums.ts`

**Step 1: Add ErrorCode enum**

Add to the end of `apps/api/src/common/enums.ts`:

```typescript
export enum ErrorCode {
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  COMPANY_NOT_FOUND = 'COMPANY_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  AUDIT_LOG_NOT_FOUND = 'AUDIT_LOG_NOT_FOUND',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
```

**Step 2: Verify existing tests still pass**

Run: `cd apps/api && npx jest --passWithNoTests`
Expected: All existing tests PASS

**Step 3: Commit**

```
feat(api): add ErrorCode enum for structured API error responses
```

---

## Task 2: Backend — Update HttpExceptionFilter to include errorCode

**Files:**
- Modify: `apps/api/src/common/filters/http-exception.filter.ts`
- Test: `apps/api/src/common/filters/http-exception.filter.spec.ts`

**Step 1: Write the failing test**

Create `apps/api/src/common/filters/http-exception.filter.spec.ts`:

```typescript
import { HttpException, HttpStatus, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ErrorCode } from '../enums';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    };
  });

  it('should include errorCode when provided in exception response', () => {
    const exception = new NotFoundException({
      message: 'Tenant 123 not found',
      errorCode: ErrorCode.TENANT_NOT_FOUND,
    });

    filter.catch(exception, mockHost as any);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorCode: ErrorCode.TENANT_NOT_FOUND,
        message: 'Tenant 123 not found',
      }),
    );
  });

  it('should not include errorCode when not provided', () => {
    const exception = new HttpException('Something went wrong', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost as any);

    const response = mockResponse.json.mock.calls[0][0];
    expect(response.statusCode).toBe(400);
    expect(response.message).toBe('Something went wrong');
    expect(response).not.toHaveProperty('errorCode');
  });

  it('should handle string exception response', () => {
    const exception = new HttpException('Plain error', HttpStatus.INTERNAL_SERVER_ERROR);

    filter.catch(exception, mockHost as any);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Plain error',
      }),
    );
  });

  it('should include timestamp in response', () => {
    const exception = new UnauthorizedException({
      message: 'Invalid credentials',
      errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
    });

    filter.catch(exception, mockHost as any);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
      }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd apps/api && npx jest src/common/filters/http-exception.filter.spec.ts --verbose`
Expected: PASS (the filter already spreads object responses, so errorCode will be included when passed)

**Step 3: Verify — no implementation change needed**

The existing `HttpExceptionFilter` already works because it spreads `...error`. When a service throws `new NotFoundException({ message: '...', errorCode: ErrorCode.TENANT_NOT_FOUND })`, the `errorCode` field is automatically included in the response.

No code change needed to the filter itself — just the test to document the behavior.

**Step 4: Commit**

```
test(api): add HttpExceptionFilter tests for errorCode support
```

---

## Task 3: Backend — Update services to throw with errorCode

**Files:**
- Modify: `apps/api/src/modules/auth/auth.service.ts`
- Modify: `apps/api/src/modules/tenants/tenants.service.ts`
- Modify: `apps/api/src/modules/companies/companies.service.ts`
- Modify: `apps/api/src/modules/users/users.service.ts`
- Modify: `apps/api/src/modules/audit/audit.service.ts`
- Modify: `apps/api/src/common/filters/mikro-orm-exception.filter.ts`

**Step 1: Update existing tests to verify errorCode**

Update `apps/api/src/modules/auth/auth.service.spec.ts` — change the three UnauthorizedException tests to also verify the errorCode:

```typescript
it('should throw UnauthorizedException with errorCode when operator not found', async () => {
  operatorsService.findByEmail.mockResolvedValue(null);

  await expect(authService.login(loginDto)).rejects.toThrow(
    UnauthorizedException,
  );
  try {
    await authService.login(loginDto);
  } catch (e: any) {
    expect(e.getResponse()).toEqual(
      expect.objectContaining({ errorCode: 'AUTH_INVALID_CREDENTIALS' }),
    );
  }
});
```

Apply same pattern for: inactive operator test, wrong password test.

Update `apps/api/src/modules/tenants/tenants.service.spec.ts`:

```typescript
it('should throw NotFoundException with errorCode when tenant not found', async () => {
  em.findOne.mockResolvedValue(null);

  try {
    await service.findOne('nonexistent');
  } catch (e: any) {
    expect(e).toBeInstanceOf(NotFoundException);
    expect(e.getResponse()).toEqual(
      expect.objectContaining({ errorCode: 'TENANT_NOT_FOUND' }),
    );
  }
});
```

Apply same pattern for companies, users, and audit service specs.

**Step 2: Run tests to verify they fail**

Run: `cd apps/api && npx jest --verbose`
Expected: FAIL — errorCode not yet in the thrown exceptions

**Step 3: Update auth.service.ts**

Replace both throws in `apps/api/src/modules/auth/auth.service.ts`:

```typescript
import { ErrorCode } from '../../common/enums';

// Line 19 and 28: change both to:
throw new UnauthorizedException({
  message: 'Invalid credentials',
  errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
});
```

**Step 4: Update tenants.service.ts**

```typescript
import { ErrorCode } from '../../common/enums';

// Line 46: change to:
if (!tenant) {
  throw new NotFoundException({
    message: `Tenant ${id} not found`,
    errorCode: ErrorCode.TENANT_NOT_FOUND,
  });
}
```

**Step 5: Update companies.service.ts**

```typescript
import { ErrorCode } from '../../common/enums';

// In findOne: change to:
if (!company) {
  throw new NotFoundException({
    message: `Company ${id} not found`,
    errorCode: ErrorCode.COMPANY_NOT_FOUND,
  });
}
```

**Step 6: Update users.service.ts**

```typescript
import { ErrorCode } from '../../common/enums';

// In findOne: change to:
if (!user) {
  throw new NotFoundException({
    message: `User ${id} not found`,
    errorCode: ErrorCode.USER_NOT_FOUND,
  });
}
```

**Step 7: Update audit.service.ts**

```typescript
import { ErrorCode } from '../../common/enums';

// In findOne: change to:
if (!log) {
  throw new NotFoundException({
    message: `Audit log ${id} not found`,
    errorCode: ErrorCode.AUDIT_LOG_NOT_FOUND,
  });
}
```

**Step 8: Update mikro-orm-exception.filter.ts**

```typescript
import { ErrorCode } from '../enums';

// In the catch method, change the response to include errorCode:
response.status(HttpStatus.CONFLICT).json({
  statusCode: HttpStatus.CONFLICT,
  errorCode: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
  message: 'A record with the same unique value already exists',
  timestamp: new Date().toISOString(),
});
```

**Step 9: Run tests to verify they pass**

Run: `cd apps/api && npx jest --verbose`
Expected: All tests PASS

**Step 10: Commit**

```
feat(api): add errorCode to all service exceptions and filters
```

---

## Task 4: Backend — Add Swagger error response schema

**Files:**
- Create: `apps/api/src/common/dto/error-response.dto.ts`

**Step 1: Create error response DTO for Swagger documentation**

Create `apps/api/src/common/dto/error-response.dto.ts`:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../enums';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiPropertyOptional({ enum: ErrorCode, example: ErrorCode.AUTH_INVALID_CREDENTIALS })
  errorCode?: ErrorCode;

  @ApiProperty({ example: 'Error message' })
  message: string;

  @ApiProperty({ example: '2026-03-08T12:00:00.000Z' })
  timestamp: string;
}
```

**Step 2: Verify build**

Run: `cd apps/api && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat(api): add ErrorResponseDto for Swagger documentation
```

---

## Task 5: Frontend — Install i18n dependencies

**Files:**
- Modify: `apps/admin/package.json`

**Step 1: Install dependencies**

Run: `cd apps/admin && pnpm add i18next react-i18next i18next-browser-languagedetector`

**Step 2: Verify installation**

Run: `cd apps/admin && pnpm ls i18next react-i18next i18next-browser-languagedetector`
Expected: All three packages listed

**Step 3: Commit**

```
build(admin): add i18next and react-i18next dependencies
```

---

## Task 6: Frontend — Install shadcn/ui DropdownMenu

**Files:**
- Will create: `apps/admin/src/components/ui/dropdown-menu.tsx` (and dependencies)

**Step 1: Install shadcn DropdownMenu**

Run: `cd apps/admin && npx shadcn@latest add dropdown-menu --yes`

**Step 2: Verify the component was created**

Run: `ls apps/admin/src/components/ui/dropdown-menu.tsx`
Expected: File exists

**Step 3: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
build(admin): add shadcn/ui DropdownMenu component
```

---

## Task 7: Frontend — Create i18n configuration and translation files

**Files:**
- Create: `apps/admin/src/i18n/index.ts`
- Create: `apps/admin/src/i18n/locales/en/common.json`
- Create: `apps/admin/src/i18n/locales/en/auth.json`
- Create: `apps/admin/src/i18n/locales/en/tenants.json`
- Create: `apps/admin/src/i18n/locales/en/companies.json`
- Create: `apps/admin/src/i18n/locales/en/users.json`
- Create: `apps/admin/src/i18n/locales/en/activity.json`
- Create: `apps/admin/src/i18n/locales/pt-BR/common.json`
- Create: `apps/admin/src/i18n/locales/pt-BR/auth.json`
- Create: `apps/admin/src/i18n/locales/pt-BR/tenants.json`
- Create: `apps/admin/src/i18n/locales/pt-BR/companies.json`
- Create: `apps/admin/src/i18n/locales/pt-BR/users.json`
- Create: `apps/admin/src/i18n/locales/pt-BR/activity.json`

**Step 1: Create i18n configuration**

Create `apps/admin/src/i18n/index.ts`:

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import commonEn from './locales/en/common.json';
import authEn from './locales/en/auth.json';
import tenantsEn from './locales/en/tenants.json';
import companiesEn from './locales/en/companies.json';
import usersEn from './locales/en/users.json';
import activityEn from './locales/en/activity.json';

import commonPtBR from './locales/pt-BR/common.json';
import authPtBR from './locales/pt-BR/auth.json';
import tenantsPtBR from './locales/pt-BR/tenants.json';
import companiesPtBR from './locales/pt-BR/companies.json';
import usersPtBR from './locales/pt-BR/users.json';
import activityPtBR from './locales/pt-BR/activity.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEn,
        auth: authEn,
        tenants: tenantsEn,
        companies: companiesEn,
        users: usersEn,
        activity: activityEn,
      },
      'pt-BR': {
        common: commonPtBR,
        auth: authPtBR,
        tenants: tenantsPtBR,
        companies: companiesPtBR,
        users: usersPtBR,
        activity: activityPtBR,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'auth', 'tenants', 'companies', 'users', 'activity'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
  });

export default i18n;
```

**Step 2: Create English translation files**

Create `apps/admin/src/i18n/locales/en/common.json`:

```json
{
  "appName": "Admin Platform",
  "nav": {
    "dashboard": "Dashboard",
    "tenants": "Tenants",
    "activity": "Activity",
    "companies": "Companies",
    "users": "Users",
    "settings": "Settings"
  },
  "actions": {
    "create": "Create",
    "update": "Update",
    "edit": "Edit",
    "cancel": "Cancel",
    "confirm": "Confirm",
    "save": "Save",
    "manage": "Manage",
    "suspend": "Suspend",
    "activate": "Activate",
    "disable": "Disable",
    "enable": "Enable",
    "search": "Search..."
  },
  "status": {
    "active": "Active",
    "inactive": "Inactive",
    "suspended": "Suspended",
    "trial": "Trial",
    "loading": "Loading...",
    "saving": "Saving...",
    "signingIn": "Signing in...",
    "noResults": "No results found"
  },
  "labels": {
    "name": "Name",
    "email": "Email",
    "password": "Password",
    "status": "Status",
    "created": "Created",
    "lastUpdated": "Last Updated",
    "page": "Page {{page}} of {{totalPages}}"
  },
  "errors": {
    "AUTH_INVALID_CREDENTIALS": "Invalid credentials",
    "TENANT_NOT_FOUND": "Tenant not found",
    "COMPANY_NOT_FOUND": "Company not found",
    "USER_NOT_FOUND": "User not found",
    "AUDIT_LOG_NOT_FOUND": "Audit log not found",
    "UNIQUE_CONSTRAINT_VIOLATION": "A record with the same value already exists",
    "VALIDATION_ERROR": "Please check the form fields",
    "UNKNOWN": "An unexpected error occurred"
  },
  "userMenu": {
    "language": "Language",
    "english": "English",
    "portuguese": "Português (BR)",
    "signOut": "Sign out"
  },
  "diff": {
    "noChanges": "No changes",
    "from": "From:",
    "to": "To:"
  }
}
```

Create `apps/admin/src/i18n/locales/en/auth.json`:

```json
{
  "title": "Admin Platform",
  "subtitle": "Sign in to your account",
  "email": "Email",
  "password": "Password",
  "signIn": "Sign in",
  "signingIn": "Signing in..."
}
```

Create `apps/admin/src/i18n/locales/en/tenants.json`:

```json
{
  "list": {
    "title": "Tenants",
    "new": "New Tenant",
    "search": "Search tenants...",
    "suspendTitle": "Suspend Tenant",
    "activateTitle": "Activate Tenant",
    "suspendConfirm": "Are you sure you want to suspend tenant \"{{name}}\"?",
    "activateConfirm": "Are you sure you want to activate tenant \"{{name}}\"?"
  },
  "columns": {
    "name": "Name",
    "slug": "Slug",
    "status": "Status",
    "created": "Created"
  },
  "form": {
    "name": "Name",
    "slug": "Slug",
    "slugHelp": "Only lowercase letters, numbers and hyphens"
  },
  "detail": {
    "edit": "Edit Tenant",
    "notFound": "Tenant not found"
  }
}
```

Create `apps/admin/src/i18n/locales/en/companies.json`:

```json
{
  "list": {
    "title": "Companies",
    "new": "New Company",
    "search": "Search companies...",
    "disableTitle": "Disable Company",
    "enableTitle": "Enable Company",
    "disableConfirm": "Are you sure you want to disable company \"{{name}}\"?",
    "enableConfirm": "Are you sure you want to enable company \"{{name}}\"?"
  },
  "columns": {
    "name": "Name",
    "document": "Document",
    "status": "Status",
    "created": "Created"
  },
  "form": {
    "name": "Name",
    "document": "Document",
    "active": "Active"
  }
}
```

Create `apps/admin/src/i18n/locales/en/users.json`:

```json
{
  "list": {
    "title": "Users",
    "new": "New User",
    "search": "Search users...",
    "disableTitle": "Disable User",
    "enableTitle": "Enable User",
    "disableConfirm": "Are you sure you want to disable user \"{{name}}\"?",
    "enableConfirm": "Are you sure you want to enable user \"{{name}}\"?"
  },
  "columns": {
    "name": "Name",
    "email": "Email",
    "role": "Role",
    "status": "Status",
    "created": "Created"
  },
  "form": {
    "name": "Name",
    "email": "Email",
    "password": "Password",
    "role": "Role",
    "active": "Active"
  },
  "roles": {
    "tenant_admin": "Tenant Admin",
    "company_admin": "Company Admin"
  }
}
```

Create `apps/admin/src/i18n/locales/en/activity.json`:

```json
{
  "title": "Activity Log",
  "filters": {
    "allEntities": "All entities",
    "tenant": "Tenant",
    "company": "Company",
    "user": "User",
    "userCompany": "UserCompany",
    "allActions": "All actions",
    "create": "create",
    "update": "update",
    "delete": "delete"
  },
  "actions": {
    "created": "Created",
    "updated": "Updated",
    "deleted": "Deleted"
  },
  "by": "by",
  "noActivity": "No activity found",
  "noDetails": "No details available"
}
```

**Step 3: Create Portuguese (pt-BR) translation files**

Create `apps/admin/src/i18n/locales/pt-BR/common.json`:

```json
{
  "appName": "Plataforma Admin",
  "nav": {
    "dashboard": "Painel",
    "tenants": "Organizações",
    "activity": "Atividades",
    "companies": "Empresas",
    "users": "Usuários",
    "settings": "Configurações"
  },
  "actions": {
    "create": "Criar",
    "update": "Atualizar",
    "edit": "Editar",
    "cancel": "Cancelar",
    "confirm": "Confirmar",
    "save": "Salvar",
    "manage": "Gerenciar",
    "suspend": "Suspender",
    "activate": "Ativar",
    "disable": "Desativar",
    "enable": "Habilitar",
    "search": "Buscar..."
  },
  "status": {
    "active": "Ativo",
    "inactive": "Inativo",
    "suspended": "Suspenso",
    "trial": "Teste",
    "loading": "Carregando...",
    "saving": "Salvando...",
    "signingIn": "Entrando...",
    "noResults": "Nenhum resultado encontrado"
  },
  "labels": {
    "name": "Nome",
    "email": "E-mail",
    "password": "Senha",
    "status": "Status",
    "created": "Criado em",
    "lastUpdated": "Última atualização",
    "page": "Página {{page}} de {{totalPages}}"
  },
  "errors": {
    "AUTH_INVALID_CREDENTIALS": "Credenciais inválidas",
    "TENANT_NOT_FOUND": "Organização não encontrada",
    "COMPANY_NOT_FOUND": "Empresa não encontrada",
    "USER_NOT_FOUND": "Usuário não encontrado",
    "AUDIT_LOG_NOT_FOUND": "Registro de atividade não encontrado",
    "UNIQUE_CONSTRAINT_VIOLATION": "Já existe um registro com o mesmo valor",
    "VALIDATION_ERROR": "Verifique os campos do formulário",
    "UNKNOWN": "Ocorreu um erro inesperado"
  },
  "userMenu": {
    "language": "Idioma",
    "english": "English",
    "portuguese": "Português (BR)",
    "signOut": "Sair"
  },
  "diff": {
    "noChanges": "Sem alterações",
    "from": "De:",
    "to": "Para:"
  }
}
```

Create `apps/admin/src/i18n/locales/pt-BR/auth.json`:

```json
{
  "title": "Plataforma Admin",
  "subtitle": "Entre na sua conta",
  "email": "E-mail",
  "password": "Senha",
  "signIn": "Entrar",
  "signingIn": "Entrando..."
}
```

Create `apps/admin/src/i18n/locales/pt-BR/tenants.json`:

```json
{
  "list": {
    "title": "Organizações",
    "new": "Nova Organização",
    "search": "Buscar organizações...",
    "suspendTitle": "Suspender Organização",
    "activateTitle": "Ativar Organização",
    "suspendConfirm": "Tem certeza que deseja suspender a organização \"{{name}}\"?",
    "activateConfirm": "Tem certeza que deseja ativar a organização \"{{name}}\"?"
  },
  "columns": {
    "name": "Nome",
    "slug": "Slug",
    "status": "Status",
    "created": "Criado em"
  },
  "form": {
    "name": "Nome",
    "slug": "Slug",
    "slugHelp": "Apenas letras minúsculas, números e hífens"
  },
  "detail": {
    "edit": "Editar Organização",
    "notFound": "Organização não encontrada"
  }
}
```

Create `apps/admin/src/i18n/locales/pt-BR/companies.json`:

```json
{
  "list": {
    "title": "Empresas",
    "new": "Nova Empresa",
    "search": "Buscar empresas...",
    "disableTitle": "Desativar Empresa",
    "enableTitle": "Habilitar Empresa",
    "disableConfirm": "Tem certeza que deseja desativar a empresa \"{{name}}\"?",
    "enableConfirm": "Tem certeza que deseja habilitar a empresa \"{{name}}\"?"
  },
  "columns": {
    "name": "Nome",
    "document": "Documento",
    "status": "Status",
    "created": "Criado em"
  },
  "form": {
    "name": "Nome",
    "document": "Documento",
    "active": "Ativa"
  }
}
```

Create `apps/admin/src/i18n/locales/pt-BR/users.json`:

```json
{
  "list": {
    "title": "Usuários",
    "new": "Novo Usuário",
    "search": "Buscar usuários...",
    "disableTitle": "Desativar Usuário",
    "enableTitle": "Habilitar Usuário",
    "disableConfirm": "Tem certeza que deseja desativar o usuário \"{{name}}\"?",
    "enableConfirm": "Tem certeza que deseja habilitar o usuário \"{{name}}\"?"
  },
  "columns": {
    "name": "Nome",
    "email": "E-mail",
    "role": "Perfil",
    "status": "Status",
    "created": "Criado em"
  },
  "form": {
    "name": "Nome",
    "email": "E-mail",
    "password": "Senha",
    "role": "Perfil",
    "active": "Ativo"
  },
  "roles": {
    "tenant_admin": "Admin da Organização",
    "company_admin": "Admin da Empresa"
  }
}
```

Create `apps/admin/src/i18n/locales/pt-BR/activity.json`:

```json
{
  "title": "Registro de Atividades",
  "filters": {
    "allEntities": "Todas as entidades",
    "tenant": "Organização",
    "company": "Empresa",
    "user": "Usuário",
    "userCompany": "VínculoUsuário",
    "allActions": "Todas as ações",
    "create": "criar",
    "update": "atualizar",
    "delete": "excluir"
  },
  "actions": {
    "created": "Criou",
    "updated": "Atualizou",
    "deleted": "Excluiu"
  },
  "by": "por",
  "noActivity": "Nenhuma atividade encontrada",
  "noDetails": "Sem detalhes disponíveis"
}
```

**Step 4: Initialize i18n in main.tsx**

Modify `apps/admin/src/main.tsx` — add import before App:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import { App } from './app';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

**Step 5: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```
feat(admin): add i18n configuration with English and Portuguese translations
```

---

## Task 8: Frontend — Create formatting helpers

**Files:**
- Create: `apps/admin/src/i18n/formatters.ts`

**Step 1: Create formatting helpers**

Create `apps/admin/src/i18n/formatters.ts`:

```typescript
import i18n from './index';

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(i18n.language, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(i18n.language).format(value);
}
```

**Step 2: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat(admin): add i18n date and number formatting helpers
```

---

## Task 9: Frontend — Create UserMenu component

**Files:**
- Create: `apps/admin/src/components/layout/user-menu.tsx`
- Modify: `apps/admin/src/components/layout/header.tsx`

**Step 1: Create UserMenu component**

Create `apps/admin/src/components/layout/user-menu.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/features/auth/auth-provider';
import { Globe, LogOut, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const languages = [
  { code: 'en', label: 'english' },
  { code: 'pt-BR', label: 'portuguese' },
] as const;

export function UserMenu() {
  const { t, i18n } = useTranslation('common');
  const { operator, logout } = useAuth();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground outline-none">
        {operator?.name}
        <ChevronDown className="h-3 w-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Globe className="mr-2 h-4 w-4" />
            {t('userMenu.language')}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            {languages.map((lang) => (
              <DropdownMenuItem
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
              >
                {i18n.language === lang.code && (
                  <Check className="mr-2 h-4 w-4" />
                )}
                <span className={i18n.language !== lang.code ? 'ml-6' : ''}>
                  {t(`userMenu.${lang.label}`)}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          {t('userMenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Step 2: Replace header.tsx with UserMenu**

Replace `apps/admin/src/components/layout/header.tsx`:

```tsx
import { UserMenu } from './user-menu';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div />
      <UserMenu />
    </header>
  );
}
```

**Step 3: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat(admin): add UserMenu with language switcher and logout
```

---

## Task 10: Frontend — Migrate layout components

**Files:**
- Modify: `apps/admin/src/components/layout/sidebar.tsx`

**Step 1: Update sidebar.tsx**

Replace the entire file with:

```tsx
import { Link, useRouterState } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Users,
  LayoutDashboard,
  Activity,
  Factory,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

function useTenantContext() {
  const routerState = useRouterState();
  const path = routerState.location.pathname;
  const match = path.match(/^\/tenants\/([^/]+)/);
  if (!match || match[1] === undefined) return null;
  return match[1];
}

export function Sidebar() {
  const { t } = useTranslation('common');
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const tenantId = useTenantContext();

  const mainNavigation = [
    { name: t('nav.dashboard'), href: '/', icon: LayoutDashboard, key: 'dashboard' },
    { name: t('nav.tenants'), href: '/tenants', icon: Building2, key: 'tenants' },
    { name: t('nav.activity'), href: '/activity', icon: Activity, key: 'activity' },
  ];

  const tenantSubItems = tenantId
    ? [
        {
          name: t('nav.companies'),
          href: `/tenants/${tenantId}/companies`,
          icon: Factory,
        },
        {
          name: t('nav.users'),
          href: `/tenants/${tenantId}/users`,
          icon: Users,
        },
      ]
    : [];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">{t('appName')}</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {mainNavigation.map((item) => {
          const isActive =
            item.href === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.href);

          return (
            <div key={item.key}>
              <Link
                to={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
                {item.key === 'tenants' && tenantId && (
                  <ChevronRight className="ml-auto h-3 w-3" />
                )}
              </Link>

              {item.key === 'tenants' && tenantId && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                  {tenantSubItems.map((sub) => {
                    const isSubActive = currentPath.startsWith(sub.href);
                    return (
                      <Link
                        key={sub.name}
                        to={sub.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isSubActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <sub.icon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
```

**Step 2: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
refactor(admin): migrate sidebar strings to i18n
```

---

## Task 11: Frontend — Migrate auth (login page)

**Files:**
- Modify: `apps/admin/src/features/auth/login-page.tsx`

**Step 1: Update login-page.tsx**

Replace the entire file with:

```tsx
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './auth-provider';
import { customInstance } from '@/api/client';
import { useNavigate } from '@tanstack/react-router';

export function LoginPage() {
  const { t } = useTranslation('auth');
  const { t: tCommon } = useTranslation('common');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await customInstance<{
        accessToken: string;
        operator: { id: string; name: string; email: string };
      }>({
        url: '/auth/login',
        method: 'POST',
        data: { email, password },
      });

      login(response.accessToken, response.operator);
      navigate({ to: '/' });
    } catch (err: any) {
      const errorCode = err?.response?.data?.errorCode;
      setError(
        tCommon(`errors.${errorCode}`, { defaultValue: tCommon('errors.UNKNOWN') })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              {t('email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              {t('password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isLoading ? t('signingIn') : t('signIn')}
          </button>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
refactor(admin): migrate login page strings to i18n
```

---

## Task 12: Frontend — Migrate dashboard route

**Files:**
- Modify: `apps/admin/src/routes/_authenticated/index.tsx`

**Step 1: Update dashboard**

Read the current file and replace hardcoded strings with `useTranslation('common')`:

- `"Dashboard"` → `t('nav.dashboard')`
- `"Welcome to the Admin Platform..."` → add a `dashboard.welcome` key to common translations

Add to `common.json` (en): `"dashboard": { "welcome": "Welcome to the Admin Platform. Use the sidebar to navigate." }`
Add to `common.json` (pt-BR): `"dashboard": { "welcome": "Bem-vindo à Plataforma Admin. Use o menu lateral para navegar." }`

**Step 2: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
refactor(admin): migrate dashboard strings to i18n
```

---

## Task 13: Frontend — Migrate shared components

**Files:**
- Modify: `apps/admin/src/components/shared/confirm-dialog.tsx`
- Modify: `apps/admin/src/components/shared/diff-viewer.tsx`
- Modify: `apps/admin/src/components/data-table/data-table.tsx`
- Modify: `apps/admin/src/components/data-table/pagination.tsx`

**Step 1: Update confirm-dialog.tsx**

Add `useTranslation('common')` and replace:
- Default `confirmLabel` prop from `"Confirm"` → `t('actions.confirm')`
- `"Cancel"` button → `t('actions.cancel')`

**Step 2: Update diff-viewer.tsx**

Add `useTranslation('common')` and replace:
- `"No changes"` → `t('diff.noChanges')`
- `"From:"` → `t('diff.from')`
- `"To:"` → `t('diff.to')`

**Step 3: Update data-table.tsx**

Add `useTranslation('common')` and replace:
- Default search placeholder `"Search..."` → `t('actions.search')`
- `"Loading..."` → `t('status.loading')`
- `"No results found"` → `t('status.noResults')`

**Step 4: Update pagination.tsx**

Add `useTranslation('common')` and replace:
- `"Page X of Y"` → `t('labels.page', { page, totalPages })`

**Step 5: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 6: Commit**

```
refactor(admin): migrate shared components and data-table strings to i18n
```

---

## Task 14: Frontend — Migrate tenants feature

**Files:**
- Modify: `apps/admin/src/features/tenants/tenants-list-page.tsx`
- Modify: `apps/admin/src/features/tenants/columns.tsx`
- Modify: `apps/admin/src/features/tenants/tenant-form.tsx`
- Modify: `apps/admin/src/features/tenants/tenant-layout.tsx`
- Modify: `apps/admin/src/features/tenants/tenant-detail-page.tsx`

**Step 1: Update tenants-list-page.tsx**

Add `useTranslation('tenants')` and `useTranslation('common')`. Replace:
- `"Tenants"` → `t('list.title')`
- `"New Tenant"` → `t('list.new')`
- `"Manage"` → `tCommon('actions.manage')`
- `"Suspend"` → `tCommon('actions.suspend')`
- `"Activate"` → `tCommon('actions.activate')`
- `"Search tenants..."` → `t('list.search')`
- Confirm dialog titles and messages → `t('list.suspendTitle')`, `t('list.suspendConfirm', { name })`, etc.

**Step 2: Update columns.tsx**

Add `useTranslation('tenants')`. Replace column headers:
- `"Name"` → `t('columns.name')`
- `"Slug"` → `t('columns.slug')`
- `"Status"` → `t('columns.status')`
- `"Created"` → `t('columns.created')`

Note: Since columns are defined outside a component, either convert them to a function that receives `t`, or use a hook-based approach (e.g., `useColumns()` custom hook).

**Step 3: Update tenant-form.tsx**

Add `useTranslation('tenants')` and `useTranslation('common')`. Replace:
- `"Name"` → `t('form.name')`
- `"Slug"` → `t('form.slug')`
- `"Only lowercase..."` → `t('form.slugHelp')`
- `"Saving..."` → `tCommon('status.saving')`
- `"Update"` / `"Create"` → `tCommon('actions.update')` / `tCommon('actions.create')`

**Step 4: Update tenant-layout.tsx**

Add `useTranslation('tenants')` and `useTranslation('common')`. Replace:
- Tab labels: `"Settings"` → `tCommon('nav.settings')`, `"Companies"` → `tCommon('nav.companies')`, `"Users"` → `tCommon('nav.users')`
- `"Loading..."` → `tCommon('status.loading')`
- `"Tenant not found"` → `t('detail.notFound')`
- `"Suspend"` / `"Activate"` → `tCommon('actions.suspend')` / `tCommon('actions.activate')`
- Confirm dialog strings → use tenants namespace keys

**Step 5: Update tenant-detail-page.tsx**

Add `useTranslation('tenants')` and `useTranslation('common')`. Replace:
- `"Loading..."` → `tCommon('status.loading')`
- `"Tenant not found"` → `t('detail.notFound')`
- `"Edit Tenant"` → `t('detail.edit')`
- `"Created"` → `tCommon('labels.created')`
- `"Last Updated"` → `tCommon('labels.lastUpdated')`

**Step 6: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 7: Commit**

```
refactor(admin): migrate tenants feature strings to i18n
```

---

## Task 15: Frontend — Migrate companies feature

**Files:**
- Modify: `apps/admin/src/features/companies/companies-list-page.tsx`
- Modify: `apps/admin/src/features/companies/columns.tsx`
- Modify: `apps/admin/src/features/companies/company-form.tsx`

**Step 1: Update companies-list-page.tsx**

Add `useTranslation('companies')` and `useTranslation('common')`. Replace all hardcoded strings with translation keys following the same pattern as tenants.

**Step 2: Update columns.tsx**

Same approach as tenant columns. Replace:
- Column headers with `t('columns.*')`
- `"Active"` / `"Inactive"` status labels → `tCommon('status.active')` / `tCommon('status.inactive')`

**Step 3: Update company-form.tsx**

Add `useTranslation('companies')` and `useTranslation('common')`. Replace form labels and buttons.

**Step 4: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
refactor(admin): migrate companies feature strings to i18n
```

---

## Task 16: Frontend — Migrate users feature

**Files:**
- Modify: `apps/admin/src/features/users/users-list-page.tsx`
- Modify: `apps/admin/src/features/users/columns.tsx`
- Modify: `apps/admin/src/features/users/user-form.tsx`

**Step 1: Update users-list-page.tsx**

Add `useTranslation('users')` and `useTranslation('common')`. Replace all hardcoded strings.

**Step 2: Update columns.tsx**

Replace column headers, role labels (`t('roles.tenant_admin')`, `t('roles.company_admin')`), and status labels.

**Step 3: Update user-form.tsx**

Replace form labels, role options, and buttons:
- `"Tenant Admin"` → `t('roles.tenant_admin')`
- `"Company Admin"` → `t('roles.company_admin')`

**Step 4: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
refactor(admin): migrate users feature strings to i18n
```

---

## Task 17: Frontend — Migrate activity feature

**Files:**
- Modify: `apps/admin/src/features/activity/activity-page.tsx`
- Modify: `apps/admin/src/features/activity/components/activity-timeline.tsx`
- Modify: `apps/admin/src/features/activity/components/change-detail-card.tsx`

**Step 1: Update activity-page.tsx**

Add `useTranslation('activity')` and `useTranslation('common')`. Replace:
- `"Activity Log"` → `t('title')`
- Filter options → `t('filters.*')`
- `"Loading..."` → `tCommon('status.loading')`
- `"No activity found"` → `t('noActivity')`

**Step 2: Update activity-timeline.tsx**

Add `useTranslation('activity')`. Replace:
- Action labels (`"Created"`, `"Updated"`, `"Deleted"`) → `t('actions.*')`
- `"by"` → `t('by')`

**Step 3: Update change-detail-card.tsx**

Add `useTranslation('activity')`. Replace:
- `"No details available"` → `t('noDetails')`

**Step 4: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
refactor(admin): migrate activity feature strings to i18n
```

---

## Task 18: Frontend — Migrate date formatting to Intl

**Files:**
- All files that display dates (columns, detail pages, activity timeline)

**Step 1: Find all date formatting**

Search for `.toLocaleDateString()`, `new Date()` formatting, or raw date display across all feature files.

**Step 2: Replace with formatDate/formatDateTime helpers**

Import from `@/i18n/formatters` and replace raw date displays with `formatDate()` or `formatDateTime()`.

**Step 3: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
refactor(admin): use Intl-based formatters for dates
```

---

## Task 19: Backend — Regenerate Orval client

**Files:**
- Generated files in `apps/admin/src/api/generated/`

**Step 1: Start API server**

Run: `cd apps/api && pnpm run start:dev` (in background)

**Step 2: Regenerate Orval client**

Run: `cd apps/admin && pnpm run api:generate`
Expected: Generated files updated with ErrorCode type from Swagger schema

**Step 3: Verify build**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
build(admin): regenerate Orval client with ErrorCode types
```

---

## Task 20: Final verification

**Step 1: Run API tests**

Run: `cd apps/api && npx jest --verbose`
Expected: All tests PASS

**Step 2: Run admin build**

Run: `cd apps/admin && pnpm run build`
Expected: Build succeeds

**Step 3: Manual verification checklist**

- [ ] App loads in English by default
- [ ] Switching browser to pt-BR loads Portuguese
- [ ] Language selector in UserMenu works
- [ ] Language persists after page reload (localStorage)
- [ ] All pages show translated strings
- [ ] Login error shows translated message
- [ ] Dates format correctly per locale
- [ ] Fallback to English for missing keys

**Step 4: Final commit if any fixes needed**

```
fix(admin): address i18n verification issues
```
