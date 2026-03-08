import { useTranslation } from 'react-i18next';
import { Link, useRouterState } from '@tanstack/react-router';
import { Building2, LayoutDashboard, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const { t } = useTranslation('common');
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const mainNavigation = [
    { key: 'dashboard', name: t('nav.dashboard'), href: '/', icon: LayoutDashboard },
    { key: 'tenants', name: t('nav.tenants'), href: '/tenants', icon: Building2 },
    { key: 'activity', name: t('nav.activity'), href: '/activity', icon: Activity },
  ];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">{t('appName')}</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {mainNavigation.map((item) => {
          const isActive =
            item.href === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.href);

          return (
            <Link
              key={item.key}
              to={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
