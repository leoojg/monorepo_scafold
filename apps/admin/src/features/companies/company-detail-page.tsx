import { useQuery } from '@tanstack/react-query';
import { customInstance } from '@/api/client';

interface CompanyDetailPageProps {
  tenantId: string;
  companyId: string;
}

export function CompanyDetailPage({ tenantId, companyId }: CompanyDetailPageProps) {
  const { data: company, isLoading } = useQuery({
    queryKey: ['companies', tenantId, companyId],
    queryFn: () =>
      customInstance<any>({
        url: `/tenants/${tenantId}/companies/${companyId}`,
        method: 'GET',
      }),
  });

  if (isLoading) return <div className="text-muted-foreground">Loading...</div>;
  if (!company) return <div className="text-muted-foreground">Company not found</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{company.name}</h1>
      <div className="grid gap-4 rounded-lg border p-6">
        <div>
          <p className="text-sm text-muted-foreground">Document</p>
          <p className="font-medium">{company.document}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="font-medium">{company.isActive ? 'Active' : 'Inactive'}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-medium">{new Date(company.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
