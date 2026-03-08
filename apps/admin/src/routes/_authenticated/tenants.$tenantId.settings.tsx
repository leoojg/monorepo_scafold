import { createFileRoute } from '@tanstack/react-router';
import { TenantSettingsPage } from '@/features/tenants/tenant-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/settings')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <TenantSettingsPage tenantId={tenantId} />;
  },
});
