import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { columns } from './columns';
import { customInstance } from '@/api/client';
import { useQuery } from '@tanstack/react-query';

async function fetchTenants(params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({
    url: '/tenants',
    method: 'GET',
    params,
  });
}

export function TenantsListPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', { page, search }],
    queryFn: () =>
      fetchTenants({
        page,
        limit: 20,
        search: search || undefined,
      }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
      </div>

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
        searchPlaceholder="Search tenants..."
      />
    </div>
  );
}
