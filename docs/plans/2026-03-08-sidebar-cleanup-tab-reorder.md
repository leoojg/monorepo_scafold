# Sidebar Cleanup & Tab Reorder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Remove dynamic sidebar sub-items when accessing a tenant and reorder tabs to Companies → Users → Settings.

**Architecture:** Simplify the sidebar to static navigation, reorder the tabs array in TenantLayout, and swap the index route from Settings to Companies (creating a new `/settings` route for Settings).

**Tech Stack:** React, TanStack Router, Lucide Icons, Tailwind CSS

---

### Task 1: Simplify the Sidebar

**Files:**
- Modify: `apps/admin/src/components/layout/sidebar.tsx`

**Step 1: Remove dynamic tenant sub-items and simplify sidebar**

Replace the entire file with:

```tsx
import { Link, useRouterState } from '@tanstack/react-router';
import { Building2, LayoutDashboard, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
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
        {mainNavigation.map((item) => {
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

Removed:
- `useTenantContext` hook
- `tenantSubItems` array
- `ChevronRight`, `Users`, `Factory` imports
- Sub-item rendering block
- Wrapping `<div>` around each nav link (no longer needed)

**Step 2: Verify the app compiles**

Run: `cd apps/admin && pnpm build`
Expected: No compilation errors

**Step 3: Commit**

```
git add apps/admin/src/components/layout/sidebar.tsx
git commit -m "refactor(admin): simplify sidebar by removing tenant sub-items"
```

---

### Task 2: Create Settings Route

**Files:**
- Create: `apps/admin/src/routes/_authenticated/tenants.$tenantId.settings.tsx`

**Step 1: Create the new settings route file**

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { TenantSettingsPage } from '@/features/tenants/tenant-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/settings')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <TenantSettingsPage tenantId={tenantId} />;
  },
});
```

**Step 2: Verify the app compiles**

Run: `cd apps/admin && pnpm build`
Expected: No compilation errors

**Step 3: Commit**

```
git add apps/admin/src/routes/_authenticated/tenants.\$tenantId.settings.tsx
git commit -m "feat(admin): add dedicated settings route for tenant"
```

---

### Task 3: Change Index Route to Companies

**Files:**
- Modify: `apps/admin/src/routes/_authenticated/tenants.$tenantId.index.tsx`

**Step 1: Update index route to render CompaniesListPage**

Replace the entire file with:

```tsx
import { createFileRoute } from '@tanstack/react-router';
import { CompaniesListPage } from '@/features/companies/companies-list-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <CompaniesListPage tenantId={tenantId} />;
  },
});
```

**Step 2: Remove the old companies route (now redundant with index)**

Delete: `apps/admin/src/routes/_authenticated/tenants.$tenantId.companies/index.tsx`

The companies directory can be removed since the index route now serves this purpose.

> **Note:** If other files exist inside `tenants.$tenantId.companies/` (e.g., sub-routes for company detail), keep the directory and only remove `index.tsx`. The sub-routes will continue to work since they match under `/tenants/$tenantId/companies/...`.

**Step 3: Verify the app compiles**

Run: `cd apps/admin && pnpm build`
Expected: No compilation errors

**Step 4: Commit**

```
git add -A apps/admin/src/routes/_authenticated/
git commit -m "refactor(admin): make companies the default tenant tab"
```

---

### Task 4: Reorder Tabs in TenantLayout

**Files:**
- Modify: `apps/admin/src/features/tenants/tenant-layout.tsx`

**Step 1: Update the tabs array**

Replace the current tabs definition (lines 14-18):

```tsx
const tabs = [
  { to: '/tenants/$tenantId' as const, label: 'Settings', icon: Settings, exact: true },
  { to: '/tenants/$tenantId/companies' as const, label: 'Companies', icon: Factory, exact: false },
  { to: '/tenants/$tenantId/users' as const, label: 'Users', icon: Users, exact: false },
];
```

With:

```tsx
const tabs = [
  { to: '/tenants/$tenantId' as const, label: 'Companies', icon: Factory, exact: true },
  { to: '/tenants/$tenantId/users' as const, label: 'Users', icon: Users, exact: false },
  { to: '/tenants/$tenantId/settings' as const, label: 'Settings', icon: Settings, exact: false },
];
```

Changes:
- Companies is now first, pointing to the index route (`/tenants/$tenantId`) with `exact: true`
- Users stays second
- Settings is now last, pointing to `/tenants/$tenantId/settings` with `exact: false`

**Step 2: Verify the app compiles**

Run: `cd apps/admin && pnpm build`
Expected: No compilation errors

**Step 3: Manually verify in browser**

1. Navigate to `/tenants` — sidebar shows simple "Tenants" link, no chevron, no sub-items
2. Click a tenant — lands on Companies tab (index route)
3. Tab order is: Companies | Users | Settings
4. Click each tab — correct content loads
5. Navigate away from tenant — sidebar unchanged (no dynamic items)

**Step 4: Commit**

```
git add apps/admin/src/features/tenants/tenant-layout.tsx
git commit -m "refactor(admin): reorder tenant tabs to companies, users, settings"
```
