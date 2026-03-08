import { Module, forwardRef } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Operator } from './operator.entity';
import { OperatorsService } from './operators.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MikroOrmModule.forFeature([Operator]), forwardRef(() => AuthModule)],
  providers: [OperatorsService],
  exports: [OperatorsService],
})
export class OperatorsModule {}
