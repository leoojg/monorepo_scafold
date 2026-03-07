import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  active: 'bg-green-100 text-green-800',
  suspended: 'bg-red-100 text-red-800',
  trial: 'bg-yellow-100 text-yellow-800',
};

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        statusStyles[status] ?? 'bg-gray-100 text-gray-800',
      )}
    >
      {status}
    </span>
  );
}
