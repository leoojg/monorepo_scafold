import { createFileRoute } from '@tanstack/react-router';
import { TenantLayout } from '@/features/tenants/tenant-layout';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <TenantLayout tenantId={tenantId} />;
  },
});
