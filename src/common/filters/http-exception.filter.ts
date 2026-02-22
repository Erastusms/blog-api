// src/common/filters/http-exception.filter.ts
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

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response<ErrorResponse>>(); // Fix: Ambil dari ctx.getResponse() dan gunakan generic type
    const request = ctx.getRequest<Request>();

    const errorResponse = this.buildErrorResponse(exception, request);

    this.logger.error(`${request.method} ${request.url}`, JSON.stringify(errorResponse));

    response.status(errorResponse.statusCode).json(errorResponse);
  }

  private buildErrorResponse(exception: unknown, request: Request): ErrorResponse {
    const timestamp = new Date().toISOString();
    const path = request.url;

    // Handle HttpException
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message: string | string[] }).message;

      return {
        statusCode: status,
        message,
        error: exception.name,
        timestamp,
        path,
      };
    }

    // Handle Prisma errors
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.handlePrismaError(exception, timestamp, path);
    }

    // Handle Prisma validation errors
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Invalid data provided',
        error: 'ValidationError',
        timestamp,
        path,
      };
    }

    // Handle JWT errors
    // Handle malformed JWT (invalid JSON payload)
    if (
      exception instanceof SyntaxError &&
      typeof exception.message === 'string' &&
      exception.message.includes('Unexpected token')
    ) {
      return {
        statusCode: HttpStatus.UNAUTHORIZED,
        message: 'Invalid or malformed token',
        error: 'UnauthorizedException',
        timestamp,
        path,
      };
    }

    // Handle unknown errors
    this.logger.error('Unhandled exception', exception);
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: 'InternalServerError',
      timestamp,
      path,
    };
  }

  private handlePrismaError(
    exception: Prisma.PrismaClientKnownRequestError,
    timestamp: string,
    path: string,
  ): ErrorResponse {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'A record with this value already exists',
          error: 'ConflictError',
          timestamp,
          path,
        };
      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Record not found',
          error: 'NotFoundError',
          timestamp,
          path,
        };
      case 'P2003':
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Invalid foreign key constraint',
          error: 'ValidationError',
          timestamp,
          path,
        };
      default:
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database error occurred',
          error: 'DatabaseError',
          timestamp,
          path,
        };
    }
  }
}
