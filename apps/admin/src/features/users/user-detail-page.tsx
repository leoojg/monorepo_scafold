import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/client';

interface UserDetailPageProps {
  tenantId: string;
  userId: string;
}

export function UserDetailPage({ tenantId, userId }: UserDetailPageProps) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['users', tenantId, userId],
    queryFn: () =>
      customInstance<any>({
        url: `/tenants/${tenantId}/users/${userId}`,
        method: 'GET',
      }),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!user) return <div className="text-muted-foreground">User not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{user.name}</h1>
      <div className="grid gap-4 rounded-lg border p-6">
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{user.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Role</p>
          <p className="font-medium">{user.role}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium">{user.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-medium">{new Date(user.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
