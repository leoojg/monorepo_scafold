import { useTranslation } from 'react-i18next';
import { ChangeDetailCard } from './change-detail-card';

const actionColors: Record<string, string> = {
  create: 'bg-green-500',
  update: 'bg-blue-500',
  delete: 'bg-red-500',
};

interface AuditLogEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changes?: any;
  performedByType: string;
  performedById?: string;
  createdAt: string;
}

interface ActivityTimelineProps {
  logs: AuditLogEntry[];
  onSelectLog?: (log: AuditLogEntry) => void;
  selectedLogId?: string;
}

export function ActivityTimeline({
  logs,
  onSelectLog,
  selectedLogId,
}: ActivityTimelineProps) {
  const { t } = useTranslation('activity');

  const actionLabels: Record<string, string> = {
    create: t('actions.created'),
    update: t('actions.updated'),
    delete: t('actions.deleted'),
  };

  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={`h-3 w-3 rounded-full ${actionColors[log.action] ?? 'bg-gray-400'}`}
            />
            <div className="w-px flex-1 bg-border" />
          </div>

          <div className="flex-1 pb-4">
            <button
              onClick={() => onSelectLog?.(log)}
              className={`w-full text-left rounded-lg border p-3 transition-colors hover:bg-accent ${
                selectedLogId === log.id ? 'border-primary bg-accent' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      log.action === 'create'
                        ? 'bg-green-100 text-green-800'
                        : log.action === 'update'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {actionLabels[log.action] ?? log.action}
                  </span>
                  <span className="text-sm font-medium">{log.entityType}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('by')} {log.performedByType}
                {log.performedById ? ` (${log.performedById.slice(0, 8)}...)` : ''}
              </p>
            </button>

            {selectedLogId === log.id && (
              <div className="mt-2">
                <ChangeDetailCard log={log} />
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
