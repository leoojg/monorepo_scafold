import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from './columns';
import { customInstance } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

interface CompaniesListPageProps {
  tenantId: string;
}

async function fetchCompanies(tenantId: string, params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({
    url: `/tenants/${tenantId}/companies`,
    method: 'GET',
    params,
  });
}

export function CompaniesListPage({ tenantId }: CompaniesListPageProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['companies', tenantId, { page, search }],
    queryFn: () => fetchCompanies(tenantId, { page, limit: 20, search: search || undefined }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Companies</h1>
      <DataTable
        columns={columns}
        data={data?.items ?? []}
        isLoading={isLoading}
        pagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 0,
          hasNext: data?.hasNext ?? false,
          hasPrevious: data?.hasPrevious ?? false,
          onPageChange: setPage,
        }}
        onSearchChange={setSearch}
        searchPlaceholder="Search companies..."
      />
    </div>
  );
}
