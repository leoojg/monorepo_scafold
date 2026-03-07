import { Tenant } from './tenant.entity';
import { TenantStatus } from '../../common/enums';

describe('Tenant Entity', () => {
  it('should create a tenant with default status ACTIVE', () => {
    const tenant = new Tenant();
    tenant.name = 'Acme Corp';
    tenant.slug = 'acme-corp';

    expect(tenant.name).toBe('Acme Corp');
    expect(tenant.slug).toBe('acme-corp');
    expect(tenant.status).toBe(TenantStatus.ACTIVE);
    expect(tenant.createdAt).toBeInstanceOf(Date);
  });
});
