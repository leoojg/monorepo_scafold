# CRUD Interfaces Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement full CRUD operations (create, edit, disable) for tenants, companies and users with contextual sidebar navigation.

**Architecture:** Modify existing components to add mutation support (useMutation + cache invalidation). Add modal dialog for create/edit. Refactor sidebar to show contextual tenant sub-items. Add dropdown actions column to DataTable. Row click navigates (tenants) or opens edit modal (companies/users).

**Tech Stack:** React, TanStack Query (useMutation), TanStack Router, Axios (customInstance), Lucide icons, Tailwind CSS

---

## Task 1: Add Modal Dialog Component

**Files:**
- Create: `apps/admin/src/components/shared/modal.tsx`

**Step 1: Create modal component**

```tsx
import { type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
```

**Step 2: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat(admin): add reusable modal dialog component
```

---

## Task 2: Add Actions Dropdown Component

**Files:**
- Create: `apps/admin/src/components/shared/actions-dropdown.tsx`

**Step 1: Create dropdown component**

```tsx
import { useState, useRef, useEffect, type ReactNode } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface ActionsDropdownProps {
  children: ReactNode;
}

export function ActionsDropdown({ children }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1 w-48 rounded-md border bg-background py-1 shadow-lg">
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  onClick: (e: React.MouseEvent) => void;
  children: ReactNode;
  variant?: 'default' | 'destructive';
}

export function DropdownItem({ onClick, children, variant = 'default' }: DropdownItemProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`flex w-full items-center px-3 py-2 text-sm hover:bg-accent ${
        variant === 'destructive' ? 'text-destructive' : ''
      }`}
    >
      {children}
    </button>
  );
}
```

**Step 2: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat(admin): add actions dropdown component
```

---

## Task 3: Add onRowClick Support to DataTable

**Files:**
- Modify: `apps/admin/src/components/data-table/data-table.tsx`

**Step 1: Add onRowClick prop to DataTable**

Add `onRowClick` to the interface and apply it to `<tr>`:

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
  onRowClick?: (item: T) => void;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  isLoading,
  pagination,
  onSearchChange,
  searchPlaceholder = 'Search...',
  onRowClick,
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
                <tr
                  key={item.id ?? idx}
                  className={`border-b ${onRowClick ? 'cursor-pointer hover:bg-muted/50' : ''}`}
                  onClick={() => onRowClick?.(item)}
                >
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

**Step 2: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat(admin): add onRowClick support to DataTable
```

---

## Task 4: Refactor Sidebar — Contextual Tenant Navigation

**Files:**
- Modify: `apps/admin/src/components/layout/sidebar.tsx`

**Step 1: Rewrite sidebar with contextual tenant sub-items**

The sidebar should detect when we're inside a tenant route (path matches `/tenants/:id/...`) and show sub-items for Companies and Users under the tenant name.

```tsx
import { Link, useRouterState } from '@tanstack/react-router';
import {
  Building2,
  Users,
  LayoutDashboard,
  Activity,
  Factory,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
  { name: 'Activity', href: '/activity', icon: Activity },
];

function useTenantContext() {
  const routerState = useRouterState();
  const path = routerState.location.pathname;
  const match = path.match(/^\/tenants\/([^/]+)/);
  if (!match || match[1] === undefined) return null;
  return match[1];
}

export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const tenantId = useTenantContext();

  const tenantSubItems = tenantId
    ? [
        {
          name: 'Companies',
          href: `/tenants/${tenantId}/companies`,
          icon: Factory,
        },
        {
          name: 'Users',
          href: `/tenants/${tenantId}/users`,
          icon: Users,
        },
      ]
    : [];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Admin Platform</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {mainNavigation.map((item) => {
          const isActive =
            item.href === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.href);

          return (
            <div key={item.name}>
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
                {item.name === 'Tenants' && tenantId && (
                  <ChevronRight className="ml-auto h-3 w-3" />
                )}
              </Link>

              {item.name === 'Tenants' && tenantId && (
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

**Step 2: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat(admin): refactor sidebar with contextual tenant navigation
```

---

## Task 5: Tenants — Add Create Modal + Actions Column

**Files:**
- Modify: `apps/admin/src/features/tenants/tenants-list-page.tsx`
- Modify: `apps/admin/src/features/tenants/columns.tsx`

**Step 1: Add actions column to tenants columns**

```tsx
import { type Column } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/shared/status-badge';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export type { TenantRow };

export const columns: Column<TenantRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (tenant) => <span className="font-medium">{tenant.name}</span>,
  },
  {
    key: 'slug',
    header: 'Slug',
  },
  {
    key: 'status',
    header: 'Status',
    render: (tenant) => <StatusBadge status={tenant.status} />,
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (tenant) => new Date(tenant.createdAt).toLocaleDateString(),
  },
];
```

Note: we remove the Link from the name column since row click will handle navigation. We also export TenantRow type.

**Step 2: Rewrite tenants list page with create modal + actions + row click**

```tsx
import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type TenantRow } from './columns';
import { TenantForm } from './tenant-form';
import { Modal } from '@/components/shared/modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ActionsDropdown, DropdownItem } from '@/components/shared/actions-dropdown';
import { customInstance } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings, Ban, CheckCircle } from 'lucide-react';

async function fetchTenants(params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: TenantRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({
    url: '/tenants',
    method: 'GET',
    params,
  });
}

async function createTenant(data: { name: string; slug: string }) {
  return customInstance({ url: '/tenants', method: 'POST', data });
}

async function toggleTenantStatus(id: string, status: string) {
  return customInstance({
    url: `/tenants/${id}`,
    method: 'PATCH',
    data: { status },
  });
}

export function TenantsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<TenantRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', { page, search }],
    queryFn: () => fetchTenants({ page, limit: 20, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setCreateOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (tenant: TenantRow) =>
      toggleTenantStatus(
        tenant.id,
        tenant.status === 'active' ? 'suspended' : 'active',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setConfirmToggle(null);
    },
  });

  const actionsColumn = {
    key: 'actions',
    header: '',
    render: (tenant: TenantRow) => (
      <ActionsDropdown>
        <DropdownItem
          onClick={() => navigate({ to: '/tenants/$tenantId', params: { tenantId: tenant.id } })}
        >
          <Settings className="mr-2 h-4 w-4" />
          Manage
        </DropdownItem>
        <DropdownItem
          onClick={() => setConfirmToggle(tenant)}
          variant={tenant.status === 'active' ? 'destructive' : 'default'}
        >
          {tenant.status === 'active' ? (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Suspend
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </DropdownItem>
      </ActionsDropdown>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Tenant
        </button>
      </div>

      <DataTable
        columns={[...columns, actionsColumn]}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRowClick={(tenant) =>
          navigate({ to: '/tenants/$tenantId', params: { tenantId: tenant.id } })
        }
        pagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 0,
          hasNext: data?.hasNext ?? false,
          hasPrevious: data?.hasPrevious ?? false,
          onPageChange: setPage,
        }}
        onSearchChange={setSearch}
        searchPlaceholder="Search tenants..."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Tenant">
        <TenantForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
        description={`Are you sure you want to ${confirmToggle?.status === 'active' ? 'suspend' : 'activate'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.status === 'active' ? 'Suspend' : 'Activate'}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
```

**Step 3: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```
feat(admin): add tenant create modal and actions dropdown to list
```

---

## Task 6: Tenant Detail Page — Edit Form with Status Toggle

**Files:**
- Modify: `apps/admin/src/features/tenants/tenant-detail-page.tsx`
- Modify: `apps/admin/src/routes/_authenticated/tenants/$tenantId.tsx`

**Step 1: Rewrite tenant detail page as management page with edit form**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '@/api/client';
import { StatusBadge } from '@/components/shared/status-badge';
import { TenantForm } from './tenant-form';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Factory, Users, Ban, CheckCircle } from 'lucide-react';

interface TenantDetailPageProps {
  tenantId: string;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

async function fetchTenant(id: string) {
  return customInstance<Tenant>({ url: `/tenants/${id}`, method: 'GET' });
}

async function updateTenant(id: string, data: { name: string; slug: string }) {
  return customInstance({ url: `/tenants/${id}`, method: 'PATCH', data });
}

async function toggleTenantStatus(id: string, status: string) {
  return customInstance({ url: `/tenants/${id}`, method: 'PATCH', data: { status } });
}

export function TenantDetailPage({ tenantId }: TenantDetailPageProps) {
  const queryClient = useQueryClient();
  const [confirmToggle, setConfirmToggle] = useState(false);

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => fetchTenant(tenantId),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { name: string; slug: string }) => updateTenant(tenantId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: () =>
      toggleTenantStatus(tenantId, tenant?.status === 'active' ? 'suspended' : 'active'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants', tenantId] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setConfirmToggle(false);
    },
  });

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!tenant) {
    return <div className="text-muted-foreground">Tenant not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <StatusBadge status={tenant.status} />
        </div>
        <button
          onClick={() => setConfirmToggle(true)}
          className={`inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium ${
            tenant.status === 'active'
              ? 'border border-destructive text-destructive hover:bg-destructive/10'
              : 'border border-green-600 text-green-600 hover:bg-green-50'
          }`}
        >
          {tenant.status === 'active' ? (
            <>
              <Ban className="h-4 w-4" />
              Suspend
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              Activate
            </>
          )}
        </button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border p-6">
          <h2 className="mb-4 text-lg font-semibold">Edit Tenant</h2>
          <TenantForm
            initialData={{ name: tenant.name, slug: tenant.slug }}
            onSubmit={(data) => updateMutation.mutate(data)}
            isLoading={updateMutation.isPending}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Resources</h2>
          <Link
            to="/tenants/$tenantId/companies"
            params={{ tenantId }}
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <Factory className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Companies</p>
              <p className="text-sm text-muted-foreground">Manage companies for this tenant</p>
            </div>
          </Link>
          <Link
            to="/tenants/$tenantId/users"
            params={{ tenantId }}
            className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-accent"
          >
            <Users className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Users</p>
              <p className="text-sm text-muted-foreground">Manage users for this tenant</p>
            </div>
          </Link>

          <div className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</p>
            <p className="mt-2 text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">{new Date(tenant.updatedAt).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmToggle}
        title={tenant.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
        description={`Are you sure you want to ${tenant.status === 'active' ? 'suspend' : 'activate'} "${tenant.name}"?`}
        confirmLabel={tenant.status === 'active' ? 'Suspend' : 'Activate'}
        onConfirm={() => toggleMutation.mutate()}
        onCancel={() => setConfirmToggle(false)}
      />
    </div>
  );
}
```

**Step 2: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```
feat(admin): add tenant edit form and status toggle to detail page
```

---

## Task 7: Companies — Full CRUD (Create Modal, Edit Modal, Actions, Toggle)

**Files:**
- Modify: `apps/admin/src/features/companies/companies-list-page.tsx`
- Modify: `apps/admin/src/features/companies/company-form.tsx`
- Modify: `apps/admin/src/features/companies/columns.tsx`

**Step 1: Update company form to support isActive field on edit**

```tsx
import { useState, type FormEvent } from 'react';

interface CompanyFormData {
  name: string;
  document: string;
  isActive?: boolean;
}

interface CompanyFormProps {
  initialData?: CompanyFormData;
  onSubmit: (data: CompanyFormData) => void;
  isLoading?: boolean;
}

export function CompanyForm({ initialData, onSubmit, isLoading }: CompanyFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [document, setDocument] = useState(initialData?.document ?? '');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: CompanyFormData = { name, document };
    if (initialData) data.isActive = isActive;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="document" className="text-sm font-medium">Document</label>
        <input
          id="document"
          value={document}
          onChange={(e) => setDocument(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      {initialData && (
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="isActive" className="text-sm font-medium">Active</label>
        </div>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
      </button>
    </form>
  );
}
```

**Step 2: Update company columns (remove Link, export type)**

```tsx
import { type Column } from '@/components/data-table/data-table';

interface CompanyRow {
  id: string;
  name: string;
  document: string;
  isActive: boolean;
  createdAt: string;
}

export type { CompanyRow };

export const columns: Column<CompanyRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (company) => <span className="font-medium">{company.name}</span>,
  },
  {
    key: 'document',
    header: 'Document',
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (company) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          company.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {company.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (company) => new Date(company.createdAt).toLocaleDateString(),
  },
];
```

**Step 3: Rewrite companies list page with create/edit modals + actions**

```tsx
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type CompanyRow } from './columns';
import { CompanyForm } from './company-form';
import { Modal } from '@/components/shared/modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ActionsDropdown, DropdownItem } from '@/components/shared/actions-dropdown';
import { customInstance } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Ban, CheckCircle } from 'lucide-react';

interface CompaniesListPageProps {
  tenantId: string;
}

async function fetchCompanies(tenantId: string, params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: CompanyRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({ url: `/tenants/${tenantId}/companies`, method: 'GET', params });
}

async function createCompany(tenantId: string, data: { name: string; document: string }) {
  return customInstance({ url: `/tenants/${tenantId}/companies`, method: 'POST', data });
}

async function updateCompany(tenantId: string, id: string, data: Record<string, unknown>) {
  return customInstance({ url: `/tenants/${tenantId}/companies/${id}`, method: 'PATCH', data });
}

export function CompaniesListPage({ tenantId }: CompaniesListPageProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<CompanyRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<CompanyRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['companies', tenantId, { page, search }],
    queryFn: () => fetchCompanies(tenantId, { page, limit: 20, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (formData: { name: string; document: string }) => createCompany(tenantId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', tenantId] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...formData }: { id: string; name: string; document: string; isActive?: boolean }) =>
      updateCompany(tenantId, id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', tenantId] });
      setEditItem(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (company: CompanyRow) =>
      updateCompany(tenantId, company.id, { isActive: !company.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', tenantId] });
      setConfirmToggle(null);
    },
  });

  const actionsColumn = {
    key: 'actions',
    header: '',
    render: (company: CompanyRow) => (
      <ActionsDropdown>
        <DropdownItem onClick={() => setEditItem(company)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownItem>
        <DropdownItem
          onClick={() => setConfirmToggle(company)}
          variant={company.isActive ? 'destructive' : 'default'}
        >
          {company.isActive ? (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Disable
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Enable
            </>
          )}
        </DropdownItem>
      </ActionsDropdown>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Companies</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Company
        </button>
      </div>

      <DataTable
        columns={[...columns, actionsColumn]}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRowClick={(company) => setEditItem(company)}
        pagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 0,
          hasNext: data?.hasNext ?? false,
          hasPrevious: data?.hasPrevious ?? false,
          onPageChange: setPage,
        }}
        onSearchChange={setSearch}
        searchPlaceholder="Search companies..."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Company">
        <CompanyForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit Company">
        {editItem && (
          <CompanyForm
            initialData={{ name: editItem.name, document: editItem.document, isActive: editItem.isActive }}
            onSubmit={(data) => updateMutation.mutate({ id: editItem.id, ...data })}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isActive ? 'Disable Company' : 'Enable Company'}
        description={`Are you sure you want to ${confirmToggle?.isActive ? 'disable' : 'enable'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.isActive ? 'Disable' : 'Enable'}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
```

**Step 4: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
feat(admin): add companies CRUD with create/edit modals and toggle
```

---

## Task 8: Users — Full CRUD (Create Modal, Edit Modal, Actions, Toggle)

**Files:**
- Modify: `apps/admin/src/features/users/users-list-page.tsx`
- Modify: `apps/admin/src/features/users/user-form.tsx`
- Modify: `apps/admin/src/features/users/columns.tsx`

**Step 1: Update user form to support isActive field on edit**

```tsx
import { useState, type FormEvent } from 'react';

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  role: string;
  isActive?: boolean;
}

interface UserFormProps {
  initialData?: Omit<UserFormData, 'password'>;
  onSubmit: (data: UserFormData) => void;
  isLoading?: boolean;
}

export function UserForm({ initialData, onSubmit, isLoading }: UserFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [email, setEmail] = useState(initialData?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(initialData?.role ?? 'company_admin');
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: UserFormData = { name, email, role };
    if (!initialData) data.password = password;
    if (initialData) data.isActive = isActive;
    onSubmit(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">Name</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          required
        />
      </div>
      {!initialData && (
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            minLength={8}
            required
          />
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="role" className="text-sm font-medium">Role</label>
        <select
          id="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="tenant_admin">Tenant Admin</option>
          <option value="company_admin">Company Admin</option>
        </select>
      </div>
      {initialData && (
        <div className="flex items-center gap-2">
          <input
            id="isActive"
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300"
          />
          <label htmlFor="isActive" className="text-sm font-medium">Active</label>
        </div>
      )}
      <button
        type="submit"
        disabled={isLoading}
        className="inline-flex h-10 items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        {isLoading ? 'Saving...' : initialData ? 'Update' : 'Create'}
      </button>
    </form>
  );
}
```

**Step 2: Update user columns (export type)**

```tsx
import { type Column } from '@/components/data-table/data-table';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export type { UserRow };

const roleLabels: Record<string, string> = {
  tenant_admin: 'Tenant Admin',
  company_admin: 'Company Admin',
};

export const columns: Column<UserRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (user) => <span className="font-medium">{user.name}</span>,
  },
  {
    key: 'email',
    header: 'Email',
  },
  {
    key: 'role',
    header: 'Role',
    render: (user) => (
      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
        {roleLabels[user.role] ?? user.role}
      </span>
    ),
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (user) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          user.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {user.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (user) => new Date(user.createdAt).toLocaleDateString(),
  },
];
```

**Step 3: Rewrite users list page with create/edit modals + actions**

```tsx
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type UserRow } from './columns';
import { UserForm } from './user-form';
import { Modal } from '@/components/shared/modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ActionsDropdown, DropdownItem } from '@/components/shared/actions-dropdown';
import { customInstance } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Ban, CheckCircle } from 'lucide-react';

interface UsersListPageProps {
  tenantId: string;
}

async function fetchUsers(tenantId: string, params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: UserRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({ url: `/tenants/${tenantId}/users`, method: 'GET', params });
}

async function createUser(tenantId: string, data: Record<string, unknown>) {
  return customInstance({ url: `/tenants/${tenantId}/users`, method: 'POST', data });
}

async function updateUser(tenantId: string, id: string, data: Record<string, unknown>) {
  return customInstance({ url: `/tenants/${tenantId}/users/${id}`, method: 'PATCH', data });
}

export function UsersListPage({ tenantId }: UsersListPageProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<UserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', tenantId, { page, search }],
    queryFn: () => fetchUsers(tenantId, { page, limit: 20, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (formData: Record<string, unknown>) => createUser(tenantId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...formData }: { id: string } & Record<string, unknown>) =>
      updateUser(tenantId, id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      setEditItem(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (user: UserRow) =>
      updateUser(tenantId, user.id, { isActive: !user.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      setConfirmToggle(null);
    },
  });

  const actionsColumn = {
    key: 'actions',
    header: '',
    render: (user: UserRow) => (
      <ActionsDropdown>
        <DropdownItem onClick={() => setEditItem(user)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownItem>
        <DropdownItem
          onClick={() => setConfirmToggle(user)}
          variant={user.isActive ? 'destructive' : 'default'}
        >
          {user.isActive ? (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Disable
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Enable
            </>
          )}
        </DropdownItem>
      </ActionsDropdown>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New User
        </button>
      </div>

      <DataTable
        columns={[...columns, actionsColumn]}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRowClick={(user) => setEditItem(user)}
        pagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 0,
          hasNext: data?.hasNext ?? false,
          hasPrevious: data?.hasPrevious ?? false,
          onPageChange: setPage,
        }}
        onSearchChange={setSearch}
        searchPlaceholder="Search users..."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New User">
        <UserForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit User">
        {editItem && (
          <UserForm
            initialData={{
              name: editItem.name,
              email: editItem.email,
              role: editItem.role,
              isActive: editItem.isActive,
            }}
            onSubmit={(data) => updateMutation.mutate({ id: editItem.id, ...data })}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isActive ? 'Disable User' : 'Enable User'}
        description={`Are you sure you want to ${confirmToggle?.isActive ? 'disable' : 'enable'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.isActive ? 'Disable' : 'Enable'}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
```

**Step 4: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```
feat(admin): add users CRUD with create/edit modals and toggle
```

---

## Task 9: Remove Unused Detail Pages and Routes

**Files:**
- Delete: `apps/admin/src/features/companies/company-detail-page.tsx`
- Delete: `apps/admin/src/features/users/user-detail-page.tsx`
- Delete: `apps/admin/src/routes/_authenticated/tenants.$tenantId.companies/$companyId.tsx`
- Delete: `apps/admin/src/routes/_authenticated/tenants.$tenantId.users/$userId.tsx`

Since companies and users now use edit modals instead of detail pages, these files are no longer needed.

**Step 1: Delete the files**

Run:
```bash
rm apps/admin/src/features/companies/company-detail-page.tsx
rm apps/admin/src/features/users/user-detail-page.tsx
rm apps/admin/src/routes/_authenticated/tenants.\$tenantId.companies/\$companyId.tsx
rm apps/admin/src/routes/_authenticated/tenants.\$tenantId.users/\$userId.tsx
```

**Step 2: Verify the app compiles**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors (no imports to these files remain)

**Step 3: Commit**

```
refactor(admin): remove unused detail pages for companies and users
```

---

## Task 10: Final Verification — Full Build + Manual Test

**Step 1: Run full typecheck**

Run: `cd apps/admin && npx tsc --noEmit`
Expected: No errors

**Step 2: Run build**

Run: `cd apps/admin && pnpm build`
Expected: Build succeeds

**Step 3: Manual smoke test checklist**

With the API running (`cd apps/api && pnpm dev`):

1. Navigate to `/tenants` — see list with actions dropdown
2. Click "New Tenant" — modal opens, create a tenant, modal closes, list refreshes
3. Click on a tenant row — navigates to tenant management page
4. On management page — edit name/slug, save, see updates
5. Click Suspend button — confirm dialog, tenant status changes
6. Check sidebar — Companies/Users sub-items visible under Tenants
7. Click Companies in sidebar — companies list loads
8. Click "New Company" — modal opens, create, closes, list refreshes
9. Click on company row — edit modal opens
10. Use dropdown to disable company — confirm dialog works
11. Navigate to Users — same CRUD flow works
12. Sidebar updates correctly when navigating in/out of tenant context

**Step 4: Commit (if any fixes needed)**

```
fix(admin): address issues found during smoke testing
```
