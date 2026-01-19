import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = undefined;
    let data: any = undefined;

    // Handle HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const isObjectResponse = typeof exceptionResponse === 'object' && exceptionResponse !== null;

      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as any).message || 'An error occurred';
      errors =
        isObjectResponse && (exceptionResponse as any).errors
          ? (exceptionResponse as any).errors
          : undefined;
      data = isObjectResponse ? { ...(exceptionResponse as any) } : undefined;
    }
    // Handle Prisma known request errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          // Unique constraint violation
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          break;
        case 'P2025':
          // Record not found
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          break;
        case 'P2003':
          // Foreign key constraint failed
          status = HttpStatus.BAD_REQUEST;
          message = 'Related record not found';
          break;
        case 'P2000':
          // Value too long for column
          status = HttpStatus.BAD_REQUEST;
          message = 'One of the provided values is too long. Please shorten your input.';
          break;
        case 'P2005':
        case 'P2006':
          // Invalid value for field type
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid data format provided. Please check your input values.';
          break;
        default:
          // SECURITY: Don't expose internal database error details to clients
          status = HttpStatus.INTERNAL_SERVER_ERROR;
          message = 'A database error occurred. Please try again later.';
      }
      // Log full error details for debugging (server-side only)
      this.logger.error(`Prisma error [${exception.code}]: ${exception.message}`, exception.stack);
    }
    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided. Please check all required fields are filled correctly.';
      this.logger.error(`Prisma validation error: ${exception.message}`, exception.stack);
    }
    // Handle other errors
    else if (exception instanceof Error) {
      // SECURITY: In production, don't expose internal error details
      const isProduction = process.env.NODE_ENV === 'production';
      message = isProduction ? 'Internal server error' : (exception.message || 'Internal server error');
      this.logger.error(`Unhandled error: ${exception.message}`, exception.stack);
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      errors,
      data,
    };

    // Log error details
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${JSON.stringify(errorResponse.message)}`,
    );

    response.status(status).json(errorResponse);
  }
}
