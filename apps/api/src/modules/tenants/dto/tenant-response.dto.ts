import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TenantResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;

  @ApiProperty({ enum: ['active', 'suspended', 'trial'] })
  status!: string;

  @ApiPropertyOptional()
  settings?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
