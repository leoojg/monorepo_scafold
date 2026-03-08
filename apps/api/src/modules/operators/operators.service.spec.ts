import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { OperatorsService } from './operators.service';
import { RefreshTokensService } from '../auth/refresh-tokens.service';

describe('OperatorsService', () => {
  let operatorsService: OperatorsService;
  let refreshTokensService: jest.Mocked<RefreshTokensService>;
  let em: jest.Mocked<EntityManager>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperatorsService,
        {
          provide: EntityManager,
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: RefreshTokensService,
          useValue: {
            revokeByOperator: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    operatorsService = module.get(OperatorsService);
    refreshTokensService = module.get(RefreshTokensService);
    em = module.get(EntityManager);
  });

  describe('findByEmail', () => {
    it('should delegate to EntityManager.findOne', async () => {
      em.findOne.mockResolvedValue(null);
      const result = await operatorsService.findByEmail('test@example.com');
      expect(em.findOne).toHaveBeenCalledWith(expect.anything(), {
        email: 'test@example.com',
      });
      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should delegate to EntityManager.findOne', async () => {
      em.findOne.mockResolvedValue(null);
      const result = await operatorsService.findById('some-id');
      expect(em.findOne).toHaveBeenCalledWith(expect.anything(), {
        id: 'some-id',
      });
      expect(result).toBeNull();
    });
  });

  describe('revokeOperatorTokens', () => {
    it('should call refreshTokensService.revokeByOperator', async () => {
      await operatorsService.revokeOperatorTokens('operator-id');
      expect(refreshTokensService.revokeByOperator).toHaveBeenCalledWith(
        'operator-id',
      );
    });
  });
});
