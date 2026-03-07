import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { Company } from './company.entity';

describe('CompaniesService', () => {
  let service: CompaniesService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
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
            getReference: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    em = module.get(EntityManager);
  });

  describe('findAll', () => {
    it('should return paginated companies for a tenant', async () => {
      const companies = [{ id: '1', name: 'Company A' }];
      em.findAndCount.mockResolvedValue([companies, 1]);

      const result = await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toEqual(companies);
      expect(result.total).toBe(1);
      expect(em.findAndCount).toHaveBeenCalledWith(
        Company,
        expect.objectContaining({ tenant: 'tenant-1' }),
        expect.any(Object),
      );
    });

    it('should apply search filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
        search: 'alpha',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Company,
        expect.objectContaining({
          tenant: 'tenant-1',
          name: { $ilike: '%alpha%' },
        }),
        expect.any(Object),
      );
    });

    it('should apply isActive filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
        isActive: true,
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        Company,
        expect.objectContaining({
          tenant: 'tenant-1',
          isActive: true,
        }),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return company when found', async () => {
      const company = { id: '1', name: 'Company A' };
      em.findOne.mockResolvedValue(company as any);

      const result = await service.findOne('tenant-1', '1');
      expect(result).toEqual(company);
    });

    it('should throw NotFoundException when not found', async () => {
      em.findOne.mockResolvedValue(null);
      await expect(service.findOne('tenant-1', 'nope')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create company with tenant reference', async () => {
      const tenantRef = { id: 'tenant-1' };
      em.getReference.mockReturnValue(tenantRef as any);

      const dto = {
        name: 'Company A',
        document: '12345',
        tenantId: 'tenant-1',
      };
      const created = { id: '1', ...dto, tenant: tenantRef };
      em.create.mockReturnValue(created as any);

      const result = await service.create(dto as any);

      expect(em.getReference).toHaveBeenCalledWith('Tenant', 'tenant-1');
      expect(em.persistAndFlush).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update company', async () => {
      const company = { id: '1', name: 'Old' };
      em.findOne.mockResolvedValue(company as any);

      await service.update('tenant-1', '1', { name: 'New' } as any);

      expect(em.assign).toHaveBeenCalledWith(company, { name: 'New' });
      expect(em.flush).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove company', async () => {
      const company = { id: '1' };
      em.findOne.mockResolvedValue(company as any);

      await service.remove('tenant-1', '1');
      expect(em.removeAndFlush).toHaveBeenCalledWith(company);
    });
  });
});
