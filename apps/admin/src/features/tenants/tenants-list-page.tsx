import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { DataTable } from '@/components/data-table/data-table';
import { getColumns, type TenantRow } from './columns';
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
  const { t } = useTranslation('tenants');
  const { t: tCommon } = useTranslation('common');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [confirmToggle, setConfirmToggle] = useState<TenantRow | null>(null);

  const columns = getColumns(t);

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
          {tCommon('actions.manage')}
        </DropdownItem>
        <DropdownItem
          onClick={() => setConfirmToggle(tenant)}
          variant={tenant.status === 'active' ? 'destructive' : 'default'}
        >
          {tenant.status === 'active' ? (
            <>
              <Ban className="mr-2 h-4 w-4" />
              {tCommon('actions.suspend')}
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {tCommon('actions.activate')}
            </>
          )}
        </DropdownItem>
      </ActionsDropdown>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('list.title')}</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          {t('list.new')}
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
        searchPlaceholder={t('list.search')}
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('list.new')}>
        <TenantForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.status === 'active' ? t('list.suspendTitle') : t('list.activateTitle')}
        description={
          confirmToggle?.status === 'active'
            ? t('list.suspendConfirm', { name: confirmToggle?.name })
            : t('list.activateConfirm', { name: confirmToggle?.name })
        }
        confirmLabel={confirmToggle?.status === 'active' ? tCommon('actions.suspend') : tCommon('actions.activate')}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
