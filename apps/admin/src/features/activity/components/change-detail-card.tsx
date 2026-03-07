import { DiffViewer } from '@/components/shared/diff-viewer';

interface ChangeDetailCardProps {
  log: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    changes?: {
      diff?: Array<{ field: string; from?: unknown; to?: unknown }>;
      before?: Record<string, unknown>;
      after?: Record<string, unknown>;
    };
  };
}

export function ChangeDetailCard({ log }: ChangeDetailCardProps) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{log.entityType}</span>
        <span className="text-xs text-muted-foreground">({log.entityId})</span>
      </div>

      {log.changes?.diff && log.changes.diff.length > 0 ? (
        <DiffViewer diff={log.changes.diff} />
      ) : log.action === 'create' && log.changes?.after ? (
        <pre className="rounded bg-green-50 p-3 text-xs text-green-800">
          {JSON.stringify(log.changes.after, null, 2)}
        </pre>
      ) : log.action === 'delete' && log.changes?.before ? (
        <pre className="rounded bg-red-50 p-3 text-xs text-red-800">
          {JSON.stringify(log.changes.before, null, 2)}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">No details available</p>
      )}
    </div>
  );
}
