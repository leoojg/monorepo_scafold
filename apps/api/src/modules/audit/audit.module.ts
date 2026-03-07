import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { AuditLog } from './audit-log.entity';

@Module({
  imports: [MikroOrmModule.forFeature([AuditLog])],
  exports: [],
})
export class AuditModule {}
