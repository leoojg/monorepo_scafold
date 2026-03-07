import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty()
  operator!: {
    id: string;
    name: string;
    email: string;
  };
}
