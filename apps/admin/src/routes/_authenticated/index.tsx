import { useTranslation } from 'react-i18next';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.dashboard')}</h1>
      <p className="text-muted-foreground">
        {t('dashboard.welcome')}
      </p>
    </div>
  );
}
