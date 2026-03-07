import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';

export class CreateTenantDto {
  @ApiProperty({ example: 'Acme Corporation' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  name!: string;

  @ApiProperty({ example: 'acme-corp' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  @ToLowerCase()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must contain only lowercase letters, numbers and hyphens',
  })
  slug!: string;

  @ApiPropertyOptional()
  @IsOptional()
  settings?: Record<string, unknown>;
}
