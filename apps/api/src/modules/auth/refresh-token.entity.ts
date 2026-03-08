import { Entity, ManyToOne, OptionalProps, PrimaryKey, Property } from '@mikro-orm/core';
import { Operator } from '../operators/operator.entity';

@Entity({ tableName: 'refresh_tokens' })
export class RefreshToken {
  [OptionalProps]?: 'id' | 'createdAt' | 'usedAt' | 'revokedAt' | 'isValid';

  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property({ unique: true })
  tokenHash!: string;

  @ManyToOne(() => Operator)
  operator!: Operator;

  @Property({ type: 'uuid', index: true })
  family!: string;

  @Property()
  expiresAt!: Date;

  @Property({ type: 'Date', nullable: true })
  usedAt: Date | null = null;

  @Property({ type: 'Date', nullable: true })
  revokedAt: Date | null = null;

  @Property({ defaultRaw: 'now()' })
  createdAt: Date = new Date();

  @Property({ persist: false })
  get isValid(): boolean {
    return !this.usedAt && !this.revokedAt && this.expiresAt > new Date();
  }
}
