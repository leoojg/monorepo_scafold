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
