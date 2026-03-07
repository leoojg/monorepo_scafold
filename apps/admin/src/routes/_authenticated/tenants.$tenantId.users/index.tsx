import { createFileRoute } from '@tanstack/react-router';
import { UsersListPage } from '@/features/users/users-list-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/users/')({
  component: () => {
    const { tenantId } = Route.useParams();
    return <UsersListPage tenantId={tenantId} />;
  },
});
