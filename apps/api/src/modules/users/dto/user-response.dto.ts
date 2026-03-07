import { ApiProperty } from '@nestjs/swagger';

export class UserCompanyResponseDto {
  @ApiProperty()
  companyId!: string;

  @ApiProperty()
  companyName!: string;

  @ApiProperty({ enum: ['admin', 'member', 'viewer'] })
  role!: string;
}

export class UserResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ['tenant_admin', 'company_admin'] })
  role!: string;

  @ApiProperty()
  isActive!: boolean;

  @ApiProperty({ type: [UserCompanyResponseDto] })
  companies!: UserCompanyResponseDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
