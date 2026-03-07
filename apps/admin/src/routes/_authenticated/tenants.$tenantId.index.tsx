import { createFileRoute } from '@tanstack/react-router';
import { TenantDetailPage } from '@/features/tenants/tenant-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <TenantDetailPage tenantId={tenantId} />;
  },
});
