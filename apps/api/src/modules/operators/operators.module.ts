import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Operator } from './operator.entity';
import { OperatorsService } from './operators.service';

@Module({
  imports: [MikroOrmModule.forFeature([Operator])],
  providers: [OperatorsService],
  exports: [OperatorsService],
})
export class OperatorsModule {}
