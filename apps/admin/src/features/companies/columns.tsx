import { type Column } from '@/components/data-table/data-table';

interface CompanyRow {
  id: string;
  name: string;
  document: string;
  isActive: boolean;
  createdAt: string;
}

export const columns: Column<CompanyRow>[] = [
  {
    key: 'name',
    header: 'Name',
    render: (company) => (
      <span className="font-medium">{company.name}</span>
    ),
  },
  {
    key: 'document',
    header: 'Document',
  },
  {
    key: 'isActive',
    header: 'Status',
    render: (company) => (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          company.isActive
            ? 'bg-green-100 text-green-800'
            : 'bg-red-100 text-red-800'
        }`}
      >
        {company.isActive ? 'Active' : 'Inactive'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: 'Created',
    render: (company) => new Date(company.createdAt).toLocaleDateString(),
  },
];
