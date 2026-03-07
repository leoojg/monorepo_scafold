import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get(UsersService);
  });

  it('findAll should pass tenantId to service', async () => {
    const result = new PaginatedResponseDto([], 0, 1, 20);
    service.findAll.mockResolvedValue(result);

    await controller.findAll('tenant-1', { page: 1, limit: 20 } as any);

    expect(service.findAll).toHaveBeenCalledWith('tenant-1', {
      page: 1,
      limit: 20,
    });
  });

  it('findOne should pass tenantId and userId', async () => {
    service.findOne.mockResolvedValue({ id: '1' } as any);

    await controller.findOne('tenant-1', '1');

    expect(service.findOne).toHaveBeenCalledWith('tenant-1', '1');
  });

  it('create should call service.create', async () => {
    const dto = {
      name: 'John',
      email: 'john@test.com',
      password: 'pass1234',
      tenantId: 'tenant-1',
      role: 'tenant_admin',
    };
    service.create.mockResolvedValue({ id: '1' } as any);

    await controller.create(dto as any);

    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('update should pass tenantId', async () => {
    service.update.mockResolvedValue({ id: '1' } as any);

    await controller.update('tenant-1', '1', { name: 'Updated' } as any);

    expect(service.update).toHaveBeenCalledWith('tenant-1', '1', {
      name: 'Updated',
    });
  });

  it('remove should pass tenantId', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('tenant-1', '1');

    expect(service.remove).toHaveBeenCalledWith('tenant-1', '1');
  });
});
