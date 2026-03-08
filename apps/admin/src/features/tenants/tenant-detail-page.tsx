import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TenantForm } from './tenant-form';
import { type Tenant, fetchTenant, updateTenant } from './tenant-api';

interface TenantSettingsPageProps {
  tenantId: string;
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
