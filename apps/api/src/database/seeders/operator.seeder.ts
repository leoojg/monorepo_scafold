import { EntityManager } from '@mikro-orm/postgresql';
import { Seeder } from '@mikro-orm/seeder';
import { Operator } from '../../modules/operators/operator.entity';
import * as bcrypt from 'bcrypt';

export class OperatorSeeder extends Seeder {
  async run(em: EntityManager): Promise<void> {
    const exists = await em.count(Operator, {});
    if (exists > 0) return;

    const operator = em.create(Operator, {
      name: 'Root Operator',
      email: 'admin@platform.com',
      passwordHash: await bcrypt.hash('change-me-immediately', 12),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await em.persistAndFlush(operator);
  }
}
