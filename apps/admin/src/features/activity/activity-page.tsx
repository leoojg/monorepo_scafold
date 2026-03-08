import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/client';
import { ActivityTimeline } from './components/activity-timeline';
import { Pagination } from '@/components/data-table/pagination';

async function fetchAuditLogs(params: {
  page: number;
  limit: number;
  entityType?: string;
  action?: string;
}) {
  return customInstance<{
    items: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  }>({
    url: '/audit',
    method: 'GET',
    params,
  });
}

export function ActivityPage() {
  const { t } = useTranslation('activity');
  const { t: tCommon } = useTranslation('common');
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [selectedLogId, setSelectedLogId] = useState<string>();

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { page, entityType, action }],
    queryFn: () =>
      fetchAuditLogs({
        page,
        limit: 20,
        entityType: entityType || undefined,
        action: action || undefined,
      }),
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('title')}</h1>

      <div className="flex gap-4">
        <select
          value={entityType}
          onChange={(e) => {
            setEntityType(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('filters.allEntities')}</option>
          <option value="Tenant">{t('filters.tenant')}</option>
          <option value="Company">{t('filters.company')}</option>
          <option value="User">{t('filters.user')}</option>
          <option value="UserCompany">{t('filters.userCompany')}</option>
        </select>

        <select
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('filters.allActions')}</option>
          <option value="create">{t('filters.create')}</option>
          <option value="update">{t('filters.update')}</option>
          <option value="delete">{t('filters.delete')}</option>
        </select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">{tCommon('status.loading')}</p>
      ) : data?.items.length === 0 ? (
        <p className="text-muted-foreground">{t('noActivity')}</p>
      ) : (
        <>
          <ActivityTimeline
            logs={data?.items ?? []}
            selectedLogId={selectedLogId}
            onSelectLog={(log) =>
              setSelectedLogId(
                selectedLogId === log.id ? undefined : log.id,
              )
            }
          />
          {data && (
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              hasNext={data.hasNext}
              hasPrevious={data.hasPrevious}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </div>
  );
}
