import { customInstance } from '@/api/client';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export async function fetchTenant(id: string) {
  return customInstance<Tenant>({ url: `/tenants/${id}`, method: 'GET' });
}

export async function updateTenant(id: string, data: { name: string; slug: string }) {
  return customInstance({ url: `/tenants/${id}`, method: 'PATCH', data });
}

export async function toggleTenantStatus(id: string, status: string) {
  return customInstance({ url: `/tenants/${id}`, method: 'PATCH', data: { status } });
}
