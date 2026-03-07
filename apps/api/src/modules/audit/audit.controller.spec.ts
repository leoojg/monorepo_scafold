import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto';

describe('AuditController', () => {
  let controller: AuditController;
  let service: jest.Mocked<AuditService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditController],
      providers: [
        {
          provide: AuditService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuditController>(AuditController);
    service = module.get(AuditService);
  });

  it('findAll should call service.findAll', async () => {
    const result = new PaginatedResponseDto([], 0, 1, 20);
    service.findAll.mockResolvedValue(result);

    const response = await controller.findAll({ page: 1, limit: 20 } as any);

    expect(response).toEqual(result);
  });

  it('findOne should call service.findOne', async () => {
    const log = { id: '1', entityType: 'Tenant' };
    service.findOne.mockResolvedValue(log as any);

    const response = await controller.findOne('1');

    expect(response).toEqual(log);
  });
});
