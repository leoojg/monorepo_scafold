import { createFileRoute } from '@tanstack/react-router';
import { TenantsListPage } from '@/features/tenants/tenants-list-page';

export const Route = createFileRoute('/_authenticated/tenants/')({
  component: TenantsListPage,
});
