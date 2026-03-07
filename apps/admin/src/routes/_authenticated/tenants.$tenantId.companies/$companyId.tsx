import { createFileRoute } from '@tanstack/react-router';
import { CompanyDetailPage } from '@/features/companies/company-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/companies/$companyId')({
  component: () => {
    const { tenantId, companyId } = Route.useParams();
    return <CompanyDetailPage tenantId={tenantId} companyId={companyId} />;
  },
});
