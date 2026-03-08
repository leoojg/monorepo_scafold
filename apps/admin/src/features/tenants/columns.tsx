import { type Column } from '@/components/data-table/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { formatDate } from '@/i18n/formatters';
import { type TFunction } from 'i18next';

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
}

export type { TenantRow };

export function getColumns(t: TFunction): Column<TenantRow>[] {
  return [
    {
      key: 'name',
      header: t('columns.name'),
      render: (tenant) => <span className="font-medium">{tenant.name}</span>,
    },
    {
      key: 'slug',
      header: t('columns.slug'),
    },
    {
      key: 'status',
      header: t('columns.status'),
      render: (tenant) => <StatusBadge status={tenant.status} />,
    },
    {
      key: 'createdAt',
      header: t('columns.created'),
      render: (tenant) => formatDate(tenant.createdAt),
    },
  ];
}
