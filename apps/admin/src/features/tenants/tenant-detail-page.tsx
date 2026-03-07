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
