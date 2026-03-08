import { createFileRoute } from '@tanstack/react-router';
import { CompaniesListPage } from '@/features/companies/companies-list-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <CompaniesListPage tenantId={tenantId} />;
  },
});
