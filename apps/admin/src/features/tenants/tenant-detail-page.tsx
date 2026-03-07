import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/client';
import { StatusBadge } from '@/components/shared/status-badge';

interface TenantDetailPageProps {
  tenantId: string;
}

async function fetchTenant(id: string) {
  return customInstance<{
    id: string;
    name: string;
    slug: string;
    status: string;
    settings?: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>({
    url: `/tenants/${id}`,
    method: 'GET',
  });
}

export function TenantDetailPage({ tenantId }: TenantDetailPageProps) {
  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenants', tenantId],
    queryFn: () => fetchTenant(tenantId),
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
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        <StatusBadge status={tenant.status} />
      </div>

      <div className="grid gap-4 rounded-lg border p-6">
        <div>
          <p className="text-sm text-muted-foreground">Slug</p>
          <p className="font-medium">{tenant.slug}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-medium">
            {new Date(tenant.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last Updated</p>
          <p className="font-medium">
            {new Date(tenant.updatedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
