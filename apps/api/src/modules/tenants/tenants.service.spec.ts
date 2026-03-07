import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { Tenant } from './tenant.entity';
import { TenantStatus } from '../../common/enums';

describe('TenantsService', () => {
  let service: TenantsService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantsService,
        {
          provide: EntityManager,
          useValue: {
            findAndCount: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            assign: jest.fn(),
            persistAndFlush: jest.fn(),
            flush: jest.fn(),
            removeAndFlush: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TenantsService>(TenantsService);
    em = module.get(EntityManager);
  });

  describe('findAll', () => {
    it('should return paginated tenants', async () => {
      const tenants = [
        { id: '1', name: 'Tenant A', slug: 'tenant-a', status: TenantStatus.ACTIVE },
      ];
      em.findAndCount.mockResolvedValue([tenants, 1]);

      const result = await service.findAll({ page: 1, limit: 20 } as any);

      expect(result.items).toEqual(tenants);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should apply search filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 20, search: 'acme' } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({ name: { $ilike: '%acme%' } }),
        expect.any(Object),
      );
    });

    it('should apply status filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        status: TenantStatus.ACTIVE,
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Tenant,
        expect.objectContaining({ status: TenantStatus.ACTIVE }),
        expect.any(Object),
      );
    });

    it('should apply sort parameter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll({
        page: 1,
        limit: 20,
        sort: '-createdAt',
        offset: 0,
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Tenant,
        expect.any(Object),
        expect.objectContaining({ orderBy: { createdAt: 'DESC' } }),
      );
    });
  });

  describe('findOne', () => {
    it('should return tenant when found', async () => {
      const tenant = { id: '1', name: 'Tenant A' };
      em.findOne.mockResolvedValue(tenant as any);

      const result = await service.findOne('1');

      expect(result).toEqual(tenant);
    });

    it('should throw NotFoundException when tenant not found', async () => {
      em.findOne.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create and persist a tenant', async () => {
      const dto = { name: 'Acme', slug: 'acme' };
      const created = { id: '1', ...dto, status: TenantStatus.ACTIVE };
      em.create.mockReturnValue(created as any);

      const result = await service.create(dto as any);

      expect(em.create).toHaveBeenCalledWith(Tenant, {
        ...dto,
        status: TenantStatus.ACTIVE,
      });
      expect(em.persistAndFlush).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update and flush a tenant', async () => {
      const tenant = { id: '1', name: 'Old Name' };
      em.findOne.mockResolvedValue(tenant as any);

      const dto = { name: 'New Name' };
      await service.update('1', dto as any);

      expect(em.assign).toHaveBeenCalledWith(tenant, dto);
      expect(em.flush).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove a tenant', async () => {
      const tenant = { id: '1' };
      em.findOne.mockResolvedValue(tenant as any);

      await service.remove('1');

      expect(em.removeAndFlush).toHaveBeenCalledWith(tenant);
    });
  });
});
