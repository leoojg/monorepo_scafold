import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '@/components/data-table/data-table';
import { getColumns, type CompanyRow } from './columns';
import { CompanyForm } from './company-form';
import { Modal } from '@/components/shared/modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ActionsDropdown, DropdownItem } from '@/components/shared/actions-dropdown';
import { customInstance } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Ban, CheckCircle } from 'lucide-react';

interface CompaniesListPageProps {
  tenantId: string;
}

async function fetchCompanies(tenantId: string, params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: CompanyRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({ url: `/tenants/${tenantId}/companies`, method: 'GET', params });
}

async function createCompany(tenantId: string, data: { name: string; document: string }) {
  return customInstance({ url: `/tenants/${tenantId}/companies`, method: 'POST', data });
}

async function updateCompany(tenantId: string, id: string, data: Record<string, unknown>) {
  return customInstance({ url: `/tenants/${tenantId}/companies/${id}`, method: 'PATCH', data });
}

export function CompaniesListPage({ tenantId }: CompaniesListPageProps) {
  const { t } = useTranslation('companies');
  const { t: tCommon } = useTranslation('common');
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<CompanyRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<CompanyRow | null>(null);

  const columns = getColumns(t, tCommon);

  const { data, isLoading } = useQuery({
    queryKey: ['companies', tenantId, { page, search }],
    queryFn: () => fetchCompanies(tenantId, { page, limit: 20, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (formData: { name: string; document: string }) => createCompany(tenantId, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', tenantId] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...formData }: { id: string; name: string; document: string; isActive?: boolean }) =>
      updateCompany(tenantId, id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', tenantId] });
      setEditItem(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (company: CompanyRow) =>
      updateCompany(tenantId, company.id, { isActive: !company.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies', tenantId] });
      setConfirmToggle(null);
    },
  });

  const actionsColumn = {
    key: 'actions',
    header: '',
    render: (company: CompanyRow) => (
      <ActionsDropdown>
        <DropdownItem onClick={() => setEditItem(company)}>
          <Pencil className="mr-2 h-4 w-4" />
          {tCommon('actions.edit')}
        </DropdownItem>
        <DropdownItem
          onClick={() => setConfirmToggle(company)}
          variant={company.isActive ? 'destructive' : 'default'}
        >
          {company.isActive ? (
            <>
              <Ban className="mr-2 h-4 w-4" />
              {tCommon('actions.disable')}
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              {tCommon('actions.enable')}
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
        onRowClick={(company) => setEditItem(company)}
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
        <CompanyForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={tCommon('actions.edit')}>
        {editItem && (
          <CompanyForm
            initialData={{ name: editItem.name, document: editItem.document, isActive: editItem.isActive }}
            onSubmit={(data) => updateMutation.mutate({ id: editItem.id, ...data })}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isActive ? t('list.disableTitle') : t('list.enableTitle')}
        description={
          confirmToggle?.isActive
            ? t('list.disableConfirm', { name: confirmToggle?.name })
            : t('list.enableConfirm', { name: confirmToggle?.name })
        }
        confirmLabel={confirmToggle?.isActive ? tCommon('actions.disable') : tCommon('actions.enable')}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
