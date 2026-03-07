import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, Min, Max, IsString } from 'class-validator';
import { ToInt } from '../decorators/to-int.decorator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @ToInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @ToInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Campo para ordenacao (ex: "createdAt" ou "-createdAt" para DESC)',
  })
  @IsOptional()
  @IsString()
  sort?: string;

  get offset(): number {
    return ((this.page ?? 1) - 1) * (this.limit ?? 20);
  }
}
