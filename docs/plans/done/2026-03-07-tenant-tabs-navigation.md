# Tenant Tabs Navigation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add tab navigation to the tenant detail layout so users can switch between Settings, Companies, and Users without losing context of which tenant they're viewing.

**Architecture:** Move the tenant header (name, status badge, suspend/activate button) into the `$tenantId.tsx` layout route. Add a tab bar below the header that uses TanStack Router `<Link>` components with active state detection. The `<Outlet />` renders the active tab content. The existing `tenant-detail-page.tsx` becomes a simpler "settings" component (just the edit form + toggle confirmation).

**Tech Stack:** React, TanStack Router, Tailwind CSS, TanStack Query, Lucide icons

---

### Task 1: Create the TenantLayout component

**Files:**
- Create: `apps/admin/src/features/tenants/tenant-layout.tsx`

**Step 1: Create the layout component with header and tabs**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useMatchRoute } from '@tanstack/react-router';
import { customInstance } from '@/api/client';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useState } from 'react';
import { Ban, CheckCircle, Settings, Factory, Users, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TenantLayoutProps {
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

async function toggleTenantStatus(id: string, status: string) {
  return customInstance({ url: `/tenants/${id}`, method: 'PATCH', data: { status } });
}

const tabs = [
  { to: '/tenants/$tenantId' as const, label: 'Settings', icon: Settings, exact: true },
  { to: '/tenants/$tenantId/companies' as const, label: 'Companies', icon: Factory, exact: false },
  { to: '/tenants/$tenantId/users' as const, label: 'Users', icon: Users, exact: false },
];

export function TenantLayout({ tenantId }: TenantLayoutProps) {
  const queryClient = useQueryClient();
  const [confirmToggle, setConfirmToggle] = useState(false);
  const matchRoute = useMatchRoute();

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => fetchTenant(tenantId),
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
          <Link
            to="/tenants"
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold">{tenant.name}</h1>
          <StatusBadge status={tenant.status} />
        </div>
        <button
          onClick={() => setConfirmToggle(true)}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-md px-4 text-sm font-medium',
            tenant.status === 'active'
              ? 'border border-destructive text-destructive hover:bg-destructive/10'
              : 'border border-green-600 text-green-600 hover:bg-green-50',
          )}
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

      <nav className="flex gap-1 border-b">
        {tabs.map((tab) => {
          const isActive = matchRoute({
            to: tab.to,
            params: { tenantId },
            fuzzy: !tab.exact,
          });
          const Icon = tab.icon;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              params={{ tenantId }}
              className={cn(
                'inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <Outlet />

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

**Step 2: Commit**

```bash
git add apps/admin/src/features/tenants/tenant-layout.tsx
git commit -m "feat(admin): create TenantLayout with header and tab navigation"
```

---

### Task 2: Wire TenantLayout into the route

**Files:**
- Modify: `apps/admin/src/routes/_authenticated/tenants/$tenantId.tsx`

**Step 1: Update the layout route to use TenantLayout**

Replace the entire file with:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { TenantLayout } from '@/features/tenants/tenant-layout';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <TenantLayout tenantId={tenantId} />;
  },
});
```

**Step 2: Commit**

```bash
git add apps/admin/src/routes/_authenticated/tenants/\$tenantId.tsx
git commit -m "feat(admin): wire TenantLayout into tenant layout route"
```

---

### Task 3: Simplify tenant-detail-page into a settings-only component

**Files:**
- Modify: `apps/admin/src/features/tenants/tenant-detail-page.tsx`

**Step 1: Strip the header, toggle, and resource links from tenant-detail-page**

The layout now handles the header, status badge, suspend/activate button, and navigation.
The detail page only needs the edit form and metadata.

Replace the entire file with:

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customInstance } from '@/api/client';
import { TenantForm } from './tenant-form';

interface TenantSettingsPageProps {
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

export function TenantSettingsPage({ tenantId }: TenantSettingsPageProps) {
  const queryClient = useQueryClient();

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

  if (isLoading) {
    return <div className="text-muted-foreground">Loading...</div>;
  }

  if (!tenant) {
    return <div className="text-muted-foreground">Tenant not found</div>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-lg border p-6">
        <h2 className="mb-4 text-lg font-semibold">Edit Tenant</h2>
        <TenantForm
          initialData={{ name: tenant.name, slug: tenant.slug }}
          onSubmit={(data) => updateMutation.mutate(data)}
          isLoading={updateMutation.isPending}
        />
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">Created</p>
        <p className="font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</p>
        <p className="mt-2 text-sm text-muted-foreground">Last Updated</p>
        <p className="font-medium">{new Date(tenant.updatedAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/admin/src/features/tenants/tenant-detail-page.tsx
git commit -m "refactor(admin): simplify tenant detail page to settings-only content"
```

---

### Task 4: Update the index route to use the renamed component

**Files:**
- Modify: `apps/admin/src/routes/_authenticated/tenants.$tenantId.index.tsx`

**Step 1: Update the import to use the new export name**

Replace the entire file with:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { TenantSettingsPage } from '@/features/tenants/tenant-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <TenantSettingsPage tenantId={tenantId} />;
  },
});
```

**Step 2: Commit**

```bash
git add apps/admin/src/routes/_authenticated/tenants.\$tenantId.index.tsx
git commit -m "refactor(admin): update tenant index route to use TenantSettingsPage"
```

---

### Task 5: Verify and fix tab active state for Settings tab

The Settings tab uses `exact: true` matching because it should only highlight on `/tenants/$tenantId` and NOT on `/tenants/$tenantId/companies`. However, TanStack Router's `useMatchRoute` with `fuzzy: false` might not match the index route as expected.

**Step 1: Manual verification**

Run the dev server and navigate to:
1. `/tenants/<id>` - Settings tab should be active
2. `/tenants/<id>/companies` - Companies tab should be active
3. `/tenants/<id>/users` - Users tab should be active

**Step 2: Fix if needed**

If the Settings tab doesn't highlight correctly on the index route, update the `tabs` array in `tenant-layout.tsx`. Change the Settings tab `to` from `/tenants/$tenantId` to `/tenants/$tenantId/` (trailing slash) and set `exact: false`, or use `activeOptions={{ exact: true }}` on the `<Link>` instead of `useMatchRoute`.

Alternative approach using Link's built-in active props:

```tsx
<Link
  to={tab.to}
  params={{ tenantId }}
  activeOptions={{ exact: tab.exact }}
  className="inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
  activeProps={{
    className: 'inline-flex items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors border-primary text-primary',
  }}
>
```

**Step 3: Commit (if changes were made)**

```bash
git add apps/admin/src/features/tenants/tenant-layout.tsx
git commit -m "fix(admin): correct tab active state detection in tenant layout"
```

---

### Task 6: Final verification

**Step 1: Run the dev server and test the full flow**

```bash
cd apps/admin && pnpm dev
```

Verify:
1. Navigate to Tenants list -> click a tenant -> lands on Settings tab with edit form
2. Click "Companies" tab -> shows companies list, header stays with tenant name
3. Click "Users" tab -> shows users list, header stays with tenant name
4. Click "Settings" tab -> back to edit form
5. Click back arrow -> returns to tenants list
6. Suspend/Activate button works from any tab
7. Browser back/forward navigation works correctly between tabs

**Step 2: Run type check**

```bash
cd apps/admin && pnpm tsc --noEmit
```

Expected: No type errors.

**Step 3: Final commit if any fixes were needed**

---

## Summary of Changes

| File | Action | Description |
|------|--------|-------------|
| `features/tenants/tenant-layout.tsx` | Create | Layout with tenant header, status, toggle, and tab navigation |
| `routes/.../tenants/$tenantId.tsx` | Modify | Use TenantLayout instead of bare Outlet |
| `features/tenants/tenant-detail-page.tsx` | Modify | Strip to settings-only (edit form + metadata), rename export |
| `routes/...tenants.$tenantId.index.tsx` | Modify | Import renamed TenantSettingsPage |

No new dependencies required. No route structure changes (existing URL patterns preserved).
