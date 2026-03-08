import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { UniqueConstraintViolationException } from '@mikro-orm/core';
import { Response } from 'express';
import { ErrorCode } from '../enums';

@Catch(UniqueConstraintViolationException)
export class MikroOrmExceptionFilter implements ExceptionFilter {
  catch(exception: UniqueConstraintViolationException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    response.status(HttpStatus.CONFLICT).json({
      statusCode: HttpStatus.CONFLICT,
      errorCode: ErrorCode.UNIQUE_CONSTRAINT_VIOLATION,
      message: 'A record with the same unique value already exists',
      timestamp: new Date().toISOString(),
    });
  }
}
