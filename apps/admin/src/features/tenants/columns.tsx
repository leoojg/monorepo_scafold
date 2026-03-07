import { type Column } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Link } from '@tanstack/react-router';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export const columns: Column<TenantRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (tenant) => (
      <Link
        to="/tenants/$tenantId"
        params={{ tenantId: tenant.id }}
        className="font-medium text-primary hover:underline"
      >
        {tenant.name}
      </Link>
    ),
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
