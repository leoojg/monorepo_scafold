import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsUUID } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

export class CreateCompanyDto {
  @ApiProperty({ example: 'Company Alpha' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  name!: string;

  @ApiProperty({ example: '12.345.678/0001-90' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  document!: string;

  @ApiPropertyOptional({ description: 'Tenant ID this company belongs to (populated from URL)' })
  @IsOptional()
  @IsUUID()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  billingInfo?: Record<string, unknown>;
}
