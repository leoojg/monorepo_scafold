import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompanyResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  document!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiPropertyOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  billingInfo?: Record<string, unknown>;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
