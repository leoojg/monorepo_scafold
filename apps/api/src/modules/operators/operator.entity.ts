import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity({ tableName: 'operators' })
export class Operator {
  @PrimaryKey({ type: 'uuid', defaultRaw: 'gen_random_uuid()' })
  id!: string;

  @Property()
  name!: string;

  @Property({ unique: true })
  email!: string;

  @Property({ hidden: true })
  passwordHash!: string;

  @Property({ default: true })
  isActive!: boolean;

  @Property()
  createdAt: Date = new Date();

  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();
}
