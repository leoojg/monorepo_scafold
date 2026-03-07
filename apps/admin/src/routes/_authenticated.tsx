import { createFileRoute, redirect } from '@tanstack/react-router';
import { AppLayout } from '@/components/layout/app-layout';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      throw redirect({ to: '/login' });
    }
  },
  component: AppLayout,
});
