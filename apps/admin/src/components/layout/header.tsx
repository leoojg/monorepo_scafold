import { UserMenu } from './user-menu';

export function Header() {
  return (
    <header className="flex h-16 items-center justify-between border-b px-6">
      <div />
      <UserMenu />
    </header>
  );
}
