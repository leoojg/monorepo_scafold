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

export enum ErrorCode {
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  COMPANY_NOT_FOUND = 'COMPANY_NOT_FOUND',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  AUDIT_LOG_NOT_FOUND = 'AUDIT_LOG_NOT_FOUND',
  UNIQUE_CONSTRAINT_VIOLATION = 'UNIQUE_CONSTRAINT_VIOLATION',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}
