import {
  EventSubscriber,
  FlushEventArgs,
  ChangeSet,
  ChangeSetType,
} from '@mikro-orm/core';
import { AuditLog } from './audit-log.entity';
import { AuditAction } from '../../common/enums';
import { auditContextStorage } from './audit-context.storage';

const AUDITABLE_ENTITIES = ['Tenant', 'Company', 'User', 'UserCompany'];

export class AuditSubscriber implements EventSubscriber {
  async afterFlush(args: FlushEventArgs): Promise<void> {
    const changeSets = args.uow.getChangeSets();
    const auditLogs: AuditLog[] = [];

    for (const cs of changeSets) {
      if (!AUDITABLE_ENTITIES.includes(cs.name)) continue;
      if (cs.name === 'AuditLog') continue;

      const log = this.createAuditLog(cs);
      if (log) auditLogs.push(log);
    }

    if (auditLogs.length > 0) {
      const em = args.em.fork();
      auditLogs.forEach((log) => em.persist(log));
      await em.flush();
    }
  }

  private createAuditLog(cs: ChangeSet<any>): AuditLog | null {
    const ctx = auditContextStorage.getStore();
    const log = new AuditLog();

    log.entityType = cs.name;
    log.entityId = cs.entity.id;
    log.performedById = ctx?.performedById;
    log.performedByType = ctx?.performedByType ?? 'system';
    log.tenantId =
      cs.entity.tenant?.id ?? cs.entity.tenantId ?? ctx?.tenantId;
    log.metadata = ctx?.metadata as any;

    switch (cs.type) {
      case ChangeSetType.CREATE:
        log.action = AuditAction.CREATE;
        log.changes = { after: this.sanitize(cs.payload) };
        break;

      case ChangeSetType.UPDATE:
        log.action = AuditAction.UPDATE;
        log.changes = {
          before: this.extractBefore(cs),
          after: this.sanitize(cs.payload),
          diff: this.computeDiff(cs),
        };
        break;

      case ChangeSetType.DELETE:
        log.action = AuditAction.DELETE;
        log.changes = { before: this.sanitize(cs.originalEntity ?? {}) };
        break;

      default:
        return null;
    }

    return log;
  }

  private computeDiff(
    cs: ChangeSet<any>,
  ): Array<{ field: string; from: unknown; to: unknown }> {
    return Object.keys(cs.payload).map((field) => ({
      field,
      from: cs.originalEntity?.[field],
      to: cs.payload[field],
    }));
  }

  private extractBefore(cs: ChangeSet<any>): Record<string, unknown> {
    const before: Record<string, unknown> = {};
    for (const field of Object.keys(cs.payload)) {
      before[field] = cs.originalEntity?.[field];
    }
    return before;
  }

  private sanitize(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...data };
    delete sanitized.passwordHash;
    delete sanitized.password;
    return sanitized;
  }
}
