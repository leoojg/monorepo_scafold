import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link, Outlet, useMatchRoute } from '@tanstack/react-router';
import { StatusBadge } from '@/components/shared/status-badge';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useState } from 'react';
import { Ban, CheckCircle, Settings, Factory, Users, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Tenant, fetchTenant, toggleTenantStatus } from './tenant-api';

interface TenantLayoutProps {
  tenantId: string;
}

export function TenantLayout({ tenantId }: TenantLayoutProps) {
  const { t } = useTranslation('tenants');
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();
  const [confirmToggle, setConfirmToggle] = useState(false);
  const matchRoute = useMatchRoute();

  const tabs = [
    { to: '/tenants/$tenantId' as const, label: tCommon('nav.companies'), icon: Factory, exact: true },
    { to: '/tenants/$tenantId/users' as const, label: tCommon('nav.users'), icon: Users, exact: false },
    { to: '/tenants/$tenantId/settings' as const, label: tCommon('nav.settings'), icon: Settings, exact: false },
  ];

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
    return <div className="text-muted-foreground">{tCommon('status.loading')}</div>;
  }

  if (!tenant) {
    return <div className="text-muted-foreground">{t('detail.notFound')}</div>;
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
              {tCommon('actions.suspend')}
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4" />
              {tCommon('actions.activate')}
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
        title={tenant.status === 'active' ? t('list.suspendTitle') : t('list.activateTitle')}
        description={
          tenant.status === 'active'
            ? t('list.suspendConfirm', { name: tenant.name })
            : t('list.activateConfirm', { name: tenant.name })
        }
        confirmLabel={tenant.status === 'active' ? tCommon('actions.suspend') : tCommon('actions.activate')}
        onConfirm={() => toggleMutation.mutate()}
        onCancel={() => setConfirmToggle(false)}
      />
    </div>
  );
}
