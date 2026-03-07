import { ChangeSetType } from '@mikro-orm/core';
import { AuditSubscriber } from './audit.subscriber';
import { AuditAction } from '../../common/enums';
import { auditContextStorage } from './audit-context.storage';

describe('AuditSubscriber', () => {
  let subscriber: AuditSubscriber;

  beforeEach(() => {
    subscriber = new AuditSubscriber();
  });

  function createMockArgs(changeSets: any[], mockEm?: any) {
    const em = mockEm ?? {
      persist: jest.fn(),
      flush: jest.fn().mockResolvedValue(undefined),
    };
    return {
      uow: { getChangeSets: () => changeSets },
      em: { fork: () => em },
    } as any;
  }

  describe('afterFlush', () => {
    it('should create audit log for CREATE changeset on auditable entity', async () => {
      const persistedLogs: any[] = [];
      const mockEm = {
        persist: (log: any) => persistedLogs.push(log),
        flush: jest.fn().mockResolvedValue(undefined),
      };

      const mockArgs = createMockArgs(
        [
          {
            name: 'Tenant',
            type: ChangeSetType.CREATE,
            entity: { id: 'tenant-1' },
            payload: { name: 'Acme', slug: 'acme' },
          },
        ],
        mockEm,
      );

      await subscriber.afterFlush(mockArgs);

      expect(persistedLogs).toHaveLength(1);
      expect(persistedLogs[0].action).toBe(AuditAction.CREATE);
      expect(persistedLogs[0].entityType).toBe('Tenant');
      expect(persistedLogs[0].entityId).toBe('tenant-1');
      expect(persistedLogs[0].changes.after).toEqual({
        name: 'Acme',
        slug: 'acme',
      });
    });

    it('should create audit log with diff for UPDATE changeset', async () => {
      const persistedLogs: any[] = [];
      const mockEm = {
        persist: (log: any) => persistedLogs.push(log),
        flush: jest.fn().mockResolvedValue(undefined),
      };

      const mockArgs = createMockArgs(
        [
          {
            name: 'Tenant',
            type: ChangeSetType.UPDATE,
            entity: { id: 'tenant-1' },
            payload: { name: 'Acme Updated' },
            originalEntity: { name: 'Acme' },
          },
        ],
        mockEm,
      );

      await subscriber.afterFlush(mockArgs);

      expect(persistedLogs).toHaveLength(1);
      expect(persistedLogs[0].action).toBe(AuditAction.UPDATE);
      expect(persistedLogs[0].changes.diff).toEqual([
        { field: 'name', from: 'Acme', to: 'Acme Updated' },
      ]);
    });

    it('should skip non-auditable entities', async () => {
      const mockArgs = createMockArgs([
        {
          name: 'SomeOtherEntity',
          type: ChangeSetType.CREATE,
          entity: { id: '1' },
          payload: {},
        },
      ]);

      await subscriber.afterFlush(mockArgs);
      // No error thrown, no logs created
    });

    it('should sanitize passwordHash from changes', async () => {
      const persistedLogs: any[] = [];
      const mockEm = {
        persist: (log: any) => persistedLogs.push(log),
        flush: jest.fn().mockResolvedValue(undefined),
      };

      const mockArgs = createMockArgs(
        [
          {
            name: 'User',
            type: ChangeSetType.CREATE,
            entity: { id: 'user-1', tenant: { id: 't-1' } },
            payload: { name: 'John', passwordHash: 'secret-hash' },
          },
        ],
        mockEm,
      );

      await subscriber.afterFlush(mockArgs);

      expect(persistedLogs[0].changes.after.passwordHash).toBeUndefined();
      expect(persistedLogs[0].changes.after.name).toBe('John');
    });

    it('should include context from AsyncLocalStorage when available', async () => {
      const persistedLogs: any[] = [];
      const mockEm = {
        persist: (log: any) => persistedLogs.push(log),
        flush: jest.fn().mockResolvedValue(undefined),
      };

      const mockArgs = createMockArgs(
        [
          {
            name: 'Tenant',
            type: ChangeSetType.CREATE,
            entity: { id: 'tenant-1' },
            payload: { name: 'Acme' },
          },
        ],
        mockEm,
      );

      await auditContextStorage.run(
        {
          performedById: 'op-1',
          performedByType: 'operator',
          metadata: { ip: '127.0.0.1', route: 'POST /tenants' },
        },
        async () => {
          await subscriber.afterFlush(mockArgs);
        },
      );

      expect(persistedLogs[0].performedById).toBe('op-1');
      expect(persistedLogs[0].performedByType).toBe('operator');
      expect(persistedLogs[0].metadata).toEqual({
        ip: '127.0.0.1',
        route: 'POST /tenants',
      });
    });
  });
});
