import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
};

const statusKeys: Record<string, string> = {
  active: 'status.active',
  inactive: 'status.inactive',
  suspended: 'status.suspended',
  trial: 'status.trial',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const { t } = useTranslation('common');

  const label = statusKeys[status] ? t(statusKeys[status]) : status;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status] ?? 'bg-gray-100 text-gray-800',
      )}
    >
      {label}
    </span>
  );
}
