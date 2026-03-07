import { Link, useRouterState } from '@tanstack/react-router';
import {
  Building2,
  Users,
  LayoutDashboard,
  Activity,
  Factory,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mainNavigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Tenants', href: '/tenants', icon: Building2 },
  { name: 'Activity', href: '/activity', icon: Activity },
];

function useTenantContext() {
  const routerState = useRouterState();
  const path = routerState.location.pathname;
  const match = path.match(/^\/tenants\/([^/]+)/);
  if (!match || match[1] === undefined) return null;
  return match[1];
}

export function Sidebar() {
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;
  const tenantId = useTenantContext();

  const tenantSubItems = tenantId
    ? [
        {
          name: 'Companies',
          href: `/tenants/${tenantId}/companies`,
          icon: Factory,
        },
        {
          name: 'Users',
          href: `/tenants/${tenantId}/users`,
          icon: Users,
        },
      ]
    : [];

  return (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center border-b px-6">
        <h2 className="text-lg font-semibold">Admin Platform</h2>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {mainNavigation.map((item) => {
          const isActive =
            item.href === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.href);

          return (
            <div key={item.name}>
              <Link
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
                {item.name === 'Tenants' && tenantId && (
                  <ChevronRight className="ml-auto h-3 w-3" />
                )}
              </Link>

              {item.name === 'Tenants' && tenantId && (
                <div className="ml-4 mt-1 space-y-1 border-l pl-3">
                  {tenantSubItems.map((sub) => {
                    const isSubActive = currentPath.startsWith(sub.href);
                    return (
                      <Link
                        key={sub.name}
                        to={sub.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isSubActive
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <sub.icon className="h-4 w-4" />
                        {sub.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
