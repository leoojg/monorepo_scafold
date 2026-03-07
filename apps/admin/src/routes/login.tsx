import { createFileRoute, redirect } from '@tanstack/react-router';
import { LoginPage } from '@/features/auth/login-page';

export const Route = createFileRoute('/login')({
  beforeLoad: () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      throw redirect({ to: '/' });
    }
  },
  component: LoginPage,
});
