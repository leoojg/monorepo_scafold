export interface RequestContext {
  performedById: string;
  performedByType: 'operator' | 'system';
  tenantId?: string;
  metadata?: {
    ip?: string;
    userAgent?: string;
    route?: string;
  };
}
