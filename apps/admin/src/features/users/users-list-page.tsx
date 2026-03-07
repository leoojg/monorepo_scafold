import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { columns, type UserRow } from './columns';
import { UserForm } from './user-form';
import { Modal } from '@/components/shared/modal';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { ActionsDropdown, DropdownItem } from '@/components/shared/actions-dropdown';
import { customInstance } from '@/api/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Ban, CheckCircle } from 'lucide-react';

interface UsersListPageProps {
  tenantId: string;
}

async function fetchUsers(tenantId: string, params: { page: number; limit: number; search?: string }) {
  return customInstance<{
    items: UserRow[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({ url: `/tenants/${tenantId}/users`, method: 'GET', params });
}

async function createUser(tenantId: string, data: Record<string, unknown>) {
  return customInstance({ url: `/tenants/${tenantId}/users`, method: 'POST', data });
}

async function updateUser(tenantId: string, id: string, data: Record<string, unknown>) {
  return customInstance({ url: `/tenants/${tenantId}/users/${id}`, method: 'PATCH', data });
}

export function UsersListPage({ tenantId }: UsersListPageProps) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<UserRow | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<UserRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users', tenantId, { page, search }],
    queryFn: () => fetchUsers(tenantId, { page, limit: 20, search: search || undefined }),
  });

  const createMutation = useMutation({
    mutationFn: (formData: { name: string; email: string; password?: string; role: string }) =>
      createUser(tenantId, formData as Record<string, unknown>),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      setCreateOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...formData }: { id: string } & Record<string, unknown>) =>
      updateUser(tenantId, id, formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      setEditItem(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (user: UserRow) =>
      updateUser(tenantId, user.id, { isActive: !user.isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', tenantId] });
      setConfirmToggle(null);
    },
  });

  const actionsColumn = {
    key: 'actions',
    header: '',
    render: (user: UserRow) => (
      <ActionsDropdown>
        <DropdownItem onClick={() => setEditItem(user)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownItem>
        <DropdownItem
          onClick={() => setConfirmToggle(user)}
          variant={user.isActive ? 'destructive' : 'default'}
        >
          {user.isActive ? (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Disable
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Enable
            </>
          )}
        </DropdownItem>
      </ActionsDropdown>
    ),
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          New User
        </button>
      </div>

      <DataTable
        columns={[...columns, actionsColumn]}
        data={data?.items ?? []}
        isLoading={isLoading}
        onRowClick={(user) => setEditItem(user)}
        pagination={{
          page: data?.page ?? 1,
          totalPages: data?.totalPages ?? 0,
          hasNext: data?.hasNext ?? false,
          hasPrevious: data?.hasPrevious ?? false,
          onPageChange: setPage,
        }}
        onSearchChange={setSearch}
        searchPlaceholder="Search users..."
      />

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New User">
        <UserForm
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Edit User">
        {editItem && (
          <UserForm
            initialData={{
              name: editItem.name,
              email: editItem.email,
              role: editItem.role,
              isActive: editItem.isActive,
            }}
            onSubmit={(data) => updateMutation.mutate({ id: editItem.id, ...data })}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={!!confirmToggle}
        title={confirmToggle?.isActive ? 'Disable User' : 'Enable User'}
        description={`Are you sure you want to ${confirmToggle?.isActive ? 'disable' : 'enable'} "${confirmToggle?.name}"?`}
        confirmLabel={confirmToggle?.isActive ? 'Disable' : 'Enable'}
        onConfirm={() => confirmToggle && toggleMutation.mutate(confirmToggle)}
        onCancel={() => setConfirmToggle(null)}
      />
    </div>
  );
}
