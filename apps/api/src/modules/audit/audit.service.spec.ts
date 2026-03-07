import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.entity';
import { AuditAction } from '../../common/enums';

describe('AuditService', () => {
  let service: AuditService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        {
          provide: EntityManager,
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuditService>(AuditService);
    em = module.get(EntityManager);
  });

  describe('findAll', () => {
    it('should return paginated audit logs', async () => {
      const logs = [
        {
          id: '1',
          entityType: 'Tenant',
          action: AuditAction.CREATE,
          createdAt: new Date(),
        },
      ];
      em.findAndCount.mockResolvedValue([logs, 1]);

      const result = await service.findAll({ page: 1, limit: 20 } as any);

      expect(result.items).toEqual(logs);
      expect(result.total).toBe(1);
    });

    it('should filter by entityType', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        entityType: 'Tenant',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ entityType: 'Tenant' }),
        expect.any(Object),
      );
    });

    it('should filter by action', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        action: AuditAction.UPDATE,
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ action: AuditAction.UPDATE }),
        expect.any(Object),
      );
    });

    it('should filter by tenantId', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        tenantId: 'tenant-1',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ tenantId: 'tenant-1' }),
        expect.any(Object),
      );
    });

    it('should filter by entityId', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        entityId: 'entity-1',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ entityId: 'entity-1' }),
        expect.any(Object),
      );
    });

    it('should filter by performedById', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        performedById: 'op-1',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.objectContaining({ performedById: 'op-1' }),
        expect.any(Object),
      );
    });

    it('should order by createdAt DESC by default', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20 } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        AuditLog,
        expect.any(Object),
        expect.objectContaining({ orderBy: { createdAt: 'DESC' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return audit log by id', async () => {
      const log = { id: '1', entityType: 'Tenant' };
      em.findOne.mockResolvedValue(log as any);

      const result = await service.findOne('1');
      expect(result).toEqual(log);
    });

    it('should throw NotFoundException when not found', async () => {
      em.findOne.mockResolvedValue(null);

      await expect(service.findOne('nope')).rejects.toThrow();
    });
  });
});
