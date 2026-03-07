# P06 — Frontend Base

## Metadata
- **Depende de:** P05
- **Branch:** main
- **Worktree:** nao

## Objetivo
Criar o app React com Vite, TanStack Router, shadcn/ui, Orval configurado, Axios client, layout base (sidebar + header), auth provider, login page e DataTable generica com paginacao.

## Arquivos a criar

```
apps/admin/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
├── postcss.config.js
├── components.json
├── index.html
├── orval.config.ts
├── src/
│   ├── main.tsx
│   ├── app.tsx
│   ├── index.css
│   ├── api/
│   │   └── client.ts
│   ├── lib/
│   │   ├── utils.ts
│   │   └── query-client.ts
│   ├── components/
│   │   ├── ui/              (gerados pelo shadcn CLI)
│   │   ├── layout/
│   │   │   ├── app-layout.tsx
│   │   │   ├── sidebar.tsx
│   │   │   └── header.tsx
│   │   ├── data-table/
│   │   │   ├── data-table.tsx
│   │   │   └── pagination.tsx
│   │   └── shared/
│   │       ├── confirm-dialog.tsx
│   │       └── status-badge.tsx
│   ├── features/
│   │   └── auth/
│   │       ├── auth-provider.tsx
│   │       └── login-page.tsx
│   └── routes/
│       ├── __root.tsx
│       ├── login.tsx
│       ├── _authenticated.tsx
│       └── _authenticated/
│           └── index.tsx
```

## Passos de execucao

### Passo 1 — apps/admin/package.json

```json
{
  "name": "@admin/admin",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src/ --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "api:generate": "orval",
    "api:watch": "chokidar '../api/openapi.json' -c 'pnpm api:generate'"
  },
  "dependencies": {
    "@tanstack/react-query": "^5.60.0",
    "@tanstack/react-router": "^1.90.0",
    "@tanstack/router-devtools": "^1.90.0",
    "axios": "^1.7.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "lucide-react": "^0.460.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.0"
  },
  "devDependencies": {
    "@admin/tsconfig": "workspace:*",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "chokidar-cli": "^3.0.0",
    "orval": "^7.3.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.7.0",
    "vite": "^6.0.0"
  }
}
```

### Passo 2 — apps/admin/tsconfig.json

```json
{
  "extends": "@admin/tsconfig/react.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### Passo 3 — apps/admin/vite.config.ts

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
```

### Passo 4 — apps/admin/tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [animate],
};

export default config;
```

### Passo 5 — apps/admin/postcss.config.js

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Passo 6 — apps/admin/components.json

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/index.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Passo 7 — apps/admin/index.html

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Admin Platform</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

### Passo 8 — apps/admin/src/index.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

### Passo 9 — apps/admin/src/lib/utils.ts

```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### Passo 10 — apps/admin/src/lib/query-client.ts

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

### Passo 11 — apps/admin/src/api/client.ts

```typescript
import Axios, { type AxiosRequestConfig } from 'axios';

const AXIOS_INSTANCE = Axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1',
});

AXIOS_INSTANCE.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

AXIOS_INSTANCE.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export const customInstance = <T>(config: AxiosRequestConfig): Promise<T> => {
  const promise = AXIOS_INSTANCE(config).then(({ data }) => data);
  return promise;
};

export default customInstance;
```

### Passo 12 — apps/admin/orval.config.ts

```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: {
      target: process.env.CI
        ? '../api/openapi.json'
        : 'http://localhost:3000/docs-json',
    },
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/schemas',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/client.ts',
          name: 'customInstance',
        },
        query: {
          useQuery: true,
          useInfinite: false,
          useSuspenseQuery: false,
          signal: true,
        },
        useNamedParameters: true,
      },
      mode: 'tags-split',
      prettier: true,
    },
  },
});
```

### Passo 13 — apps/admin/src/features/auth/auth-provider.tsx

```tsx
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

interface Operator {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  operator: Operator | null;
  token: string | null;
  login: (token: string, operator: Operator) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem('auth_token'),
  );
  const [operator, setOperator] = useState<Operator | null>(() => {
    const stored = localStorage.getItem('auth_operator');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((newToken: string, newOperator: Operator) => {
    localStorage.setItem('auth_token', newToken);
    localStorage.setItem('auth_operator', JSON.stringify(newOperator));
    setToken(newToken);
    setOperator(newOperator);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_operator');
    setToken(null);
    setOperator(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        operator,
        token,
        login,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

### Passo 14 — apps/admin/src/features/auth/login-page.tsx

```tsx
import { useState, type FormEvent } from 'react';
import { useAuth } from './auth-provider';
import { customInstance } from '@/api/client';
import { useNavigate } from '@tanstack/react-router';

export function LoginPage() {
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
    } catch {
      setError('Invalid credentials');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-6 rounded-lg border p-6 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">Admin Platform</h1>
          <p className="text-muted-foreground">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
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
              Password
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
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### Passo 15 — apps/admin/src/components/layout/sidebar.tsx

```tsx
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Building2,
  Users,
  LayoutDashboard,
  Activity,
  Factory,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
  { name: 'Companies', href: '/companies', icon: Factory },
  { name: 'Users', href: '/users', icon: Users },
  { name: 'Activity', href: '/activity', icon: Activity },
];

export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Admin Platform</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive =
            item.href === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.href);

          return (
            <Link
              key={item.name}
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
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
```

### Passo 16 — apps/admin/src/components/layout/header.tsx

```tsx
import { useAuth } from '@/features/auth/auth-provider';
import { LogOut } from 'lucide-react';

export function Header() {
  const { operator, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {operator?.name}
        </span>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
```

### Passo 17 — apps/admin/src/components/layout/app-layout.tsx

```tsx
import { Outlet } from '@tanstack/react-router';
import { Sidebar } from './sidebar';
import { Header } from './header';

export function AppLayout() {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

### Passo 18 — apps/admin/src/components/data-table/pagination.tsx

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
}

export function Pagination({
  page,
  totalPages,
  hasNext,
  hasPrevious,
  onPageChange,
}: PaginationProps) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm disabled:opacity-50"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
```

### Passo 19 — apps/admin/src/components/data-table/data-table.tsx

```tsx
import { type ReactNode } from 'react';
import { Pagination } from './pagination';

export interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => ReactNode;
}

interface PaginationData {
  page: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  pagination?: PaginationData;
  onSearchChange?: (search: string) => void;
  searchPlaceholder?: string;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  pagination,
  onSearchChange,
  searchPlaceholder = 'Search...',
}: DataTableProps<T>) {
  return (
    <div className="space-y-4">
      {onSearchChange && (
        <input
          type="text"
          placeholder={searchPlaceholder}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex h-10 w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
        />
      )}

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-4 py-3 text-left text-sm font-medium text-muted-foreground"
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-sm text-muted-foreground"
                >
                  No results found
                </td>
              </tr>
            ) : (
              data.map((item, idx) => (
                <tr key={item.id ?? idx} className="border-b">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm">
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && <Pagination {...pagination} />}
    </div>
  );
}
```

### Passo 20 — apps/admin/src/components/shared/status-badge.tsx

```tsx
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        statusStyles[status] ?? 'bg-gray-100 text-gray-800',
      )}
    >
      {status}
    </span>
  );
}
```

### Passo 21 — apps/admin/src/components/shared/confirm-dialog.tsx

```tsx
import { type ReactNode } from 'react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="inline-flex h-9 items-center rounded-md bg-destructive px-4 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Passo 22 — apps/admin/src/routes/__root.tsx

```tsx
import { createRootRoute, Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: () => <Outlet />,
});
```

### Passo 23 — apps/admin/src/routes/login.tsx

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginPage } from '@/features/auth/login-page';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});
```

### Passo 24 — apps/admin/src/routes/_authenticated.tsx

```tsx
import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/app-layout';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});
```

### Passo 25 — apps/admin/src/routes/_authenticated/index.tsx

```tsx
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to the Admin Platform. Use the sidebar to navigate.
      </p>
    </div>
  );
}
```

### Passo 26 — apps/admin/src/app.tsx

```tsx
import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createRouter } from '@tanstack/react-router';
import { AuthProvider } from '@/features/auth/auth-provider';
import { queryClient } from '@/lib/query-client';
import { routeTree } from './routeTree.gen';

const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

### Passo 27 — apps/admin/src/main.tsx

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

### Passo 28 — Instalar dependencias e gerar route tree

```bash
cd apps/admin && pnpm install
```

### Passo 29 — Instalar shadcn components base

```bash
cd apps/admin && npx shadcn@latest init -y
```

## Verificacao final

- [ ] `pnpm install` roda sem erros na raiz
- [ ] `cd apps/admin && pnpm typecheck` passa
- [ ] `cd apps/admin && pnpm dev` inicia o Vite sem erros
- [ ] Pagina de login renderiza em `http://localhost:5173/login`
- [ ] Layout com sidebar aparece apos login
- [ ] DataTable renderiza com dados mock

## Ao finalizar
1. Atualizar `docs/plans/PROGRESS.md` -> P06 status `completed`, proximo -> P07/P08/P09/P10 (paralelo)
2. Mover este arquivo para `docs/plans/done/`
