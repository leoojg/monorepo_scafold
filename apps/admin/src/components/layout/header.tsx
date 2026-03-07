import { useAuth } from '@/features/auth/auth-provider';
import { LogOut } from 'lucide-react';

export function Header() {
  const { operator, logout } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {operator?.name}
        </span>
        <button
          onClick={logout}
          className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
