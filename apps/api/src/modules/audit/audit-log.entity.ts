import {
  Entity,
  PrimaryKey,
  Property,
  Enum,
} from '@mikro-orm/core';
import { AuditAction } from '../../common/enums';

@Entity({ tableName: 'audit_logs' })
export class AuditLog {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  entityType!: string;

  @Property()
  entityId!: string;

  @Enum(() => AuditAction)
  action!: AuditAction;

  @Property({ type: 'jsonb', nullable: true })
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
    diff?: Array<{ field: string; from: unknown; to: unknown }>;
  };

  @Property({ nullable: true })
  performedById?: string;

  @Property()
  performedByType!: string;

  @Property({ nullable: true })
  tenantId?: string;

  @Property({ type: 'jsonb', nullable: true })
  metadata?: {
    ip?: string;
    userAgent?: string;
    route?: string;
  };

  @Property()
  createdAt: Date = new Date();
}
