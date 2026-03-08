import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Operator } from './operator.entity';
import { RefreshTokensService } from '../auth/refresh-tokens.service';

@Injectable()
export class OperatorsService {
  constructor(
    private readonly em: EntityManager,
    @Inject(forwardRef(() => RefreshTokensService))
    private readonly refreshTokensService: RefreshTokensService,
  ) {}

  async findByEmail(email: string): Promise<Operator | null> {
    return this.em.findOne(Operator, { email });
  }

  async findById(id: string): Promise<Operator | null> {
    return this.em.findOne(Operator, { id });
  }

  async revokeOperatorTokens(operatorId: string): Promise<void> {
    await this.refreshTokensService.revokeByOperator(operatorId);
  }
}
