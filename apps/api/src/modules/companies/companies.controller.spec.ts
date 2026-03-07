import { Test, TestingModule } from '@nestjs/testing';
import { CompaniesController } from './companies.controller';
import { CompaniesService } from './companies.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

describe('CompaniesController', () => {
  let controller: CompaniesController;
  let service: jest.Mocked<CompaniesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompaniesController],
      providers: [
        {
          provide: CompaniesService,
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

    controller = module.get<CompaniesController>(CompaniesController);
    service = module.get(CompaniesService);
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

  it('findOne should pass tenantId and companyId', async () => {
    service.findOne.mockResolvedValue({ id: '1' } as any);

    await controller.findOne('tenant-1', '1');

    expect(service.findOne).toHaveBeenCalledWith('tenant-1', '1');
  });

  it('create should call service.create', async () => {
    const dto = { name: 'Co', document: '123', tenantId: 'tenant-1' };
    service.create.mockResolvedValue({ id: '1', ...dto } as any);

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
