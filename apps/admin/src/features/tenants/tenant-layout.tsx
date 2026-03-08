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
