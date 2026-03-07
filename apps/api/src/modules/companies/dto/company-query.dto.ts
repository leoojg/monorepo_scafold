import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToBoolean } from '../../../common/decorators/to-boolean.decorator';

export class CompanyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by company name' })
  @IsOptional()
  @IsString()
  @Trim()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by active status' })
  @IsOptional()
  @ToBoolean()
  @IsBoolean()
  isActive?: boolean;
}
