import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpAdapterHost } from '@nestjs/core';
import { ExternalApiUnavailableException } from '../http/external-api-unavailable.exception';

export const isPrismaException = (exception: unknown): boolean =>
  exception instanceof Prisma.PrismaClientKnownRequestError ||
  exception instanceof Prisma.PrismaClientValidationError ||
  exception instanceof Prisma.PrismaClientRustPanicError ||
  exception instanceof Prisma.PrismaClientUnknownRequestError;

const GENERIC_ERROR_MESSAGE = 'An unexpected error occurred. Please try again later.';
const INVALID_REQUEST_MESSAGE = 'Invalid request.';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly httpAdapterHost: HttpAdapterHost) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    // In certain situations `httpAdapter` might not be available in the
    // constructor method, thus we should resolve it here.
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const path = httpAdapter.getRequestUrl(ctx.getRequest());
    const method = httpAdapter.getRequestMethod(ctx.getRequest());
    const responseBody = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(ctx.getRequest()),
      message: '',
    };

    this.logger.error(
      `Error in endpoint ${path} for method ${method}`,
      exception,
    );
    if (exception instanceof HttpException) {
      if (exception instanceof ExternalApiUnavailableException) {
        httpAdapter.setHeader(
          ctx.getResponse(),
          'Retry-After',
          String(exception.retryAfterSeconds),
        );
      }
      return httpAdapter.reply(
        ctx.getResponse(),
        exception.getResponse(),
        exception.getStatus(),
      );
    }

    if (isPrismaException(exception)) {
      responseBody.statusCode = this.prismaFilter(exception);
      // Prisma's own error messages can leak internal details (query shape,
      // file paths, sometimes raw engine/driver output). The mapped status
      // code is informative enough on its own, so the raw message stays out
      // of the response (it's already logged in full above).
      responseBody.message = INVALID_REQUEST_MESSAGE;
    } else {
      // Any other unexpected error: never forward exception.message to the
      // client. It's logged in full above for diagnosis, but may contain
      // internal details that shouldn't be exposed.
      responseBody.message = GENERIC_ERROR_MESSAGE;
    }

    httpAdapter.reply(ctx.getResponse(), responseBody, responseBody.statusCode);
  }

  private prismaKnowRequestStatus(
    exception: Prisma.PrismaClientKnownRequestError,
  ) {
    switch (exception.code) {
      case 'P2000':
      case 'P2001':
      case 'P2023':
        return HttpStatus.BAD_REQUEST;
      case 'P2002':
        return HttpStatus.CONFLICT;
      case 'P2025':
        return HttpStatus.NOT_FOUND;
      default:
        return HttpStatus.INTERNAL_SERVER_ERROR;
    }
  }

  private prismaFilter(exception: unknown): HttpStatus {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return HttpStatus.UNPROCESSABLE_ENTITY;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.prismaKnowRequestStatus(exception);
    } else {
      return HttpStatus.BAD_REQUEST;
    }
  }
}
