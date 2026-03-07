import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

describe('TenantsController', () => {
  let controller: TenantsController;
  let service: jest.Mocked<TenantsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TenantsController],
      providers: [
        {
          provide: TenantsService,
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

    controller = module.get<TenantsController>(TenantsController);
    service = module.get(TenantsService);
  });

  it('findAll should call service.findAll', async () => {
    const result = new PaginatedResponseDto([], 0, 1, 20);
    service.findAll.mockResolvedValue(result);

    const response = await controller.findAll({ page: 1, limit: 20 } as any);

    expect(response).toEqual(result);
  });

  it('findOne should call service.findOne', async () => {
    const tenant = { id: '1', name: 'Acme' };
    service.findOne.mockResolvedValue(tenant as any);

    const response = await controller.findOne('1');

    expect(response).toEqual(tenant);
  });

  it('create should call service.create', async () => {
    const dto = { name: 'Acme', slug: 'acme' };
    const created = { id: '1', ...dto };
    service.create.mockResolvedValue(created as any);

    const response = await controller.create(dto as any);

    expect(response).toEqual(created);
  });

  it('update should call service.update', async () => {
    const dto = { name: 'Updated' };
    const updated = { id: '1', name: 'Updated' };
    service.update.mockResolvedValue(updated as any);

    const response = await controller.update('1', dto as any);

    expect(response).toEqual(updated);
  });

  it('remove should call service.remove', async () => {
    service.remove.mockResolvedValue(undefined);

    await controller.remove('1');

    expect(service.remove).toHaveBeenCalledWith('1');
  });
});
