import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

describe('UsersService', () => {
  let service: UsersService;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
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

    service = module.get<UsersService>(UsersService);
    em = module.get(EntityManager);
  });

  describe('findAll', () => {
    it('should return paginated users for a tenant', async () => {
      const users = [{ id: '1', name: 'John', email: 'john@test.com' }];
      em.findAndCount.mockResolvedValue([users, 1]);

      const result = await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
      } as any);

      expect(result.items).toEqual(users);
      expect(result.total).toBe(1);
    });

    it('should apply search filter on name and email', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
        search: 'john',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          tenant: 'tenant-1',
          $or: [
            { name: { $ilike: '%john%' } },
            { email: { $ilike: '%john%' } },
          ],
        }),
        expect.any(Object),
      );
    });

    it('should apply role filter', async () => {
      em.findAndCount.mockResolvedValue([[], 0]);

      await service.findAll('tenant-1', {
        page: 1,
        limit: 20,
        role: 'tenant_admin',
      } as any);

      expect(em.findAndCount).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          tenant: 'tenant-1',
          role: 'tenant_admin',
        }),
        expect.any(Object),
      );
    });
  });

  describe('findOne', () => {
    it('should return user when found', async () => {
      const user = { id: '1', name: 'John' };
      em.findOne.mockResolvedValue(user as any);

      const result = await service.findOne('tenant-1', '1');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException with errorCode when not found', async () => {
      em.findOne.mockResolvedValue(null);

      try {
        await service.findOne('tenant-1', 'nope');
        fail('Should have thrown');
      } catch (e: any) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect(e.getResponse()).toEqual(
          expect.objectContaining({ errorCode: 'USER_NOT_FOUND' }),
        );
      }
    });
  });

  describe('create', () => {
    it('should create user with hashed password', async () => {
      const tenantRef = { id: 'tenant-1' };
      em.getReference.mockReturnValue(tenantRef as any);

      const dto = {
        name: 'John',
        email: 'john@test.com',
        password: 'password123',
        tenantId: 'tenant-1',
        role: 'tenant_admin',
      };
      const created = { id: '1', name: 'John' };
      em.create.mockReturnValue(created as any);

      const result = await service.create(dto as any);

      expect(em.create).toHaveBeenCalledWith(
        User,
        expect.objectContaining({
          name: 'John',
          email: 'john@test.com',
          role: 'tenant_admin',
          tenant: tenantRef,
        }),
      );
      expect(em.persistAndFlush).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const user = { id: '1', name: 'Old' };
      em.findOne.mockResolvedValue(user as any);

      await service.update('tenant-1', '1', { name: 'New' } as any);

      expect(em.assign).toHaveBeenCalledWith(user, { name: 'New' });
      expect(em.flush).toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('should remove user', async () => {
      const user = { id: '1' };
      em.findOne.mockResolvedValue(user as any);

      await service.remove('tenant-1', '1');
      expect(em.removeAndFlush).toHaveBeenCalledWith(user);
    });
  });
});
