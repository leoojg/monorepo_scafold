import { type Column } from '@/components/data-table/data-table';
import { formatDate } from '@/i18n/formatters';
import { type TFunction } from 'i18next';

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export type { UserRow };

export function getColumns(t: TFunction, tCommon: TFunction): Column<UserRow>[] {
  return [
    {
      key: 'name',
      header: t('columns.name'),
      render: (user) => <span className="font-medium">{user.name}</span>,
    },
    {
      key: 'email',
      header: t('columns.email'),
    },
    {
      key: 'role',
      header: t('columns.role'),
      render: (user) => (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          {t(`roles.${user.role}`, { defaultValue: user.role })}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: t('columns.status'),
      render: (user) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
            user.isActive
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {user.isActive ? tCommon('status.active') : tCommon('status.inactive')}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: t('columns.created'),
      render: (user) => formatDate(user.createdAt),
    },
  ];
}
