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

export const isPrismaException = (exception: unknown): boolean =>
  exception instanceof Prisma.PrismaClientKnownRequestError ||
  exception instanceof Prisma.PrismaClientValidationError ||
  exception instanceof Prisma.PrismaClientRustPanicError ||
  exception instanceof Prisma.PrismaClientUnknownRequestError;

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
      return httpAdapter.reply(
        ctx.getResponse(),
        exception.getResponse(),
        exception.getStatus(),
      );
    }

    if (isPrismaException(exception)) {
      responseBody.statusCode = this.prismaFilter(exception);
    }

    if (
      typeof exception === 'object' &&
      exception !== null &&
      'message' in exception &&
      typeof exception.message === 'string'
    ) {
      const parsedMessage = exception.message
        .replace(/\n/g, ' ')
        .replace(/`/g, "'")
        .replace(/ +(?= )/g, '')
        .trim();
      responseBody.message = parsedMessage;
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
