import { HttpException, HttpStatus, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ErrorCode } from '../enums';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockHost = {
      switchToHttp: () => ({
        getResponse: () => mockResponse,
      }),
    };
  });

  it('should include errorCode when provided in exception response', () => {
    const exception = new NotFoundException({
      message: 'Tenant 123 not found',
      errorCode: ErrorCode.TENANT_NOT_FOUND,
    });

    filter.catch(exception, mockHost as any);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        errorCode: ErrorCode.TENANT_NOT_FOUND,
        message: 'Tenant 123 not found',
      }),
    );
  });

  it('should not include errorCode when not provided', () => {
    const exception = new HttpException('Something went wrong', HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockHost as any);

    const response = mockResponse.json.mock.calls[0][0];
    expect(response.statusCode).toBe(400);
    expect(response.message).toBe('Something went wrong');
    expect(response).not.toHaveProperty('errorCode');
  });

  it('should handle string exception response', () => {
    const exception = new HttpException('Plain error', HttpStatus.INTERNAL_SERVER_ERROR);

    filter.catch(exception, mockHost as any);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Plain error',
      }),
    );
  });

  it('should include timestamp in response', () => {
    const exception = new UnauthorizedException({
      message: 'Invalid credentials',
      errorCode: ErrorCode.AUTH_INVALID_CREDENTIALS,
    });

    filter.catch(exception, mockHost as any);

    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        timestamp: expect.any(String),
      }),
    );
  });
});
