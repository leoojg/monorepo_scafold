import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/_authenticated/')({
  component: DashboardPage,
});

function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">
        Welcome to the Admin Platform. Use the sidebar to navigate.
      </p>
    </div>
  );
}
