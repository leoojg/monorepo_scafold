interface DiffEntry {
  field: string;
  from?: unknown;
  to?: unknown;
}

interface DiffViewerProps {
  diff: DiffEntry[];
}

export function DiffViewer({ diff }: DiffViewerProps) {
  if (diff.length === 0) {
    return <p className="text-sm text-muted-foreground">No changes</p>;
  }

  return (
    <div className="space-y-2">
      {diff.map((entry) => (
        <div key={entry.field} className="rounded border p-3">
          <p className="text-xs font-medium text-muted-foreground">
            {entry.field}
          </p>
          <div className="mt-1 flex gap-4 text-sm">
            <div className="flex-1">
              <span className="text-xs text-muted-foreground">From:</span>
              <pre className="mt-0.5 rounded bg-red-50 p-1.5 text-xs text-red-800">
                {JSON.stringify(entry.from, null, 2) ?? 'null'}
              </pre>
            </div>
            <div className="flex-1">
              <span className="text-xs text-muted-foreground">To:</span>
              <pre className="mt-0.5 rounded bg-green-50 p-1.5 text-xs text-green-800">
                {JSON.stringify(entry.to, null, 2) ?? 'null'}
              </pre>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
