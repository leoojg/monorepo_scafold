import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type TenantRow } from './columns';
import { TenantForm } from './tenant-form';
import { Modal } from '@/components/shared/modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ActionsDropdown, DropdownItem } from '@/components/shared/actions-dropdown';
import { customInstance } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Settings, Ban, CheckCircle } from 'lucide-react';

async function fetchTenants(params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: TenantRow[];
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

async function createTenant(data: { name: string; slug: string }) {
  return customInstance({ url: '/tenants', method: 'POST', data });
}

async function toggleTenantStatus(id: string, status: string) {
  return customInstance({
    url: `/tenants/${id}`,
    method: 'PATCH',
    data: { status },
  });
}

export function TenantsListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<TenantRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', { page, search }],
    queryFn: () => fetchTenants({ page, limit: 20, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setCreateOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (tenant: TenantRow) =>
      toggleTenantStatus(
        tenant.id,
        tenant.status === 'active' ? 'suspended' : 'active',
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setConfirmToggle(null);
    },
  });

  const actionsColumn = {
    key: 'actions',
    header: '',
    render: (tenant: TenantRow) => (
      <ActionsDropdown>
        <DropdownItem
          onClick={() => navigate({ to: '/tenants/$tenantId', params: { tenantId: tenant.id } })}
        >
          <Settings className="mr-2 h-4 w-4" />
          Manage
        </DropdownItem>
        <DropdownItem
          onClick={() => setConfirmToggle(tenant)}
          variant={tenant.status === 'active' ? 'destructive' : 'default'}
        >
          {tenant.status === 'active' ? (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Suspend
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </DropdownItem>
      </ActionsDropdown>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Tenants</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New Tenant
        </button>
      </div>

      <DataTable
        columns={[...columns, actionsColumn]}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRowClick={(tenant) =>
          navigate({ to: '/tenants/$tenantId', params: { tenantId: tenant.id } })
        }
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

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Tenant">
        <TenantForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
        description={`Are you sure you want to ${confirmToggle?.status === 'active' ? 'suspend' : 'activate'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.status === 'active' ? 'Suspend' : 'Activate'}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
