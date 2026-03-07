export enum TenantStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  TRIAL = 'trial',
}

export enum UserRole {
  TENANT_ADMIN = 'tenant_admin',
  COMPANY_ADMIN = 'company_admin',
}

export enum CompanyRole {
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer',
}

export enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
}
