import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Operator } from './operator.entity';

@Injectable()
export class OperatorsService {
  constructor(private readonly em: EntityManager) {}

  async findByEmail(email: string): Promise<Operator | null> {
    return this.em.findOne(Operator, { email });
  }

  async findById(id: string): Promise<Operator | null> {
    return this.em.findOne(Operator, { id });
  }
}
