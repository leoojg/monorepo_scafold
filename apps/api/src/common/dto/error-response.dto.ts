import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../enums';

export class ErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiPropertyOptional({ enum: ErrorCode, example: ErrorCode.AUTH_INVALID_CREDENTIALS })
  errorCode?: ErrorCode;

  @ApiProperty({ example: 'Error message' })
  message!: string;

  @ApiProperty({ example: '2026-03-08T12:00:00.000Z' })
  timestamp!: string;
}
