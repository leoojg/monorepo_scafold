import { createFileRoute } from '@tanstack/react-router';
import { UserDetailPage } from '@/features/users/user-detail-page';

export const Route = createFileRoute('/_authenticated/tenants/$tenantId/users/$userId')({
  component: () => {
    const { tenantId, userId } = Route.useParams();
    return <UserDetailPage tenantId={tenantId} userId={userId} />;
  },
});
