import { type Column } from '@/components/data-table/data-table';
import { formatDate } from '@/i18n/formatters';
import { type TFunction } from 'i18next';

interface CompanyRow {
  id: string;
  name: string;
  document: string;
  isActive: boolean;
  createdAt: string;
}

export type { CompanyRow };

export function getColumns(t: TFunction, tCommon: TFunction): Column<CompanyRow>[] {
  return [
    {
      key: 'name',
      header: t('columns.name'),
      render: (company) => <span className="font-medium">{company.name}</span>,
    },
    {
      key: 'document',
      header: t('columns.document'),
    },
    {
      key: 'isActive',
      header: t('columns.status'),
      render: (company) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            company.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {company.isActive ? tCommon('status.active') : tCommon('status.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('columns.created'),
      render: (company) => formatDate(company.createdAt),
    },
  ];
}
