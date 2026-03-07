import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';
import { TenantStatus } from '../../../common/enums';

export class TenantQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by tenant name' })
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @ApiPropertyOptional({ enum: TenantStatus })
  @IsOptional()
  @IsEnum(TenantStatus)
  @ToLowerCase()
  status?: TenantStatus;
}
