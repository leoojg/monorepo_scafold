import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';
import { ToLowerCase } from '../../../common/decorators/to-lower-case.decorator';

export class LoginDto {
  @ApiProperty({ example: 'admin@platform.com' })
  @IsEmail()
  @IsNotEmpty()
  @Trim()
  @ToLowerCase()
  email!: string;

  @ApiProperty({ example: 'change-me-immediately' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}
