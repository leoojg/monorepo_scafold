import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsUUID,
  MinLength,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';
import { UserRole, CompanyRole } from '../../../common/enums';

export class UserCompanyAssignmentDto {
  @ApiProperty()
  @IsUUID()
  companyId!: string;

  @ApiProperty({ enum: CompanyRole })
  @IsEnum(CompanyRole)
  role!: CompanyRole;
}

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  @IsNotEmpty()
  @IsString()
  @Trim()
  name!: string;

  @ApiProperty({ example: 'john@acme.com' })
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @ToLowerCase()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ description: 'Tenant ID' })
  @IsNotEmpty()
  @IsUUID()
  tenantId!: string;

  @ApiProperty({ enum: UserRole })
  @IsEnum(UserRole)
  role!: UserRole;

  @ApiPropertyOptional({ type: [UserCompanyAssignmentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserCompanyAssignmentDto)
  companies?: UserCompanyAssignmentDto[];
}
