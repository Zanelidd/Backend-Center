import { ArgumentsHost, NotFoundException } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ExternalApiUnavailableException } from '../http/external-api-unavailable.exception';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let httpAdapter: {
    getRequestUrl: jest.Mock;
    getRequestMethod: jest.Mock;
    reply: jest.Mock;
    setHeader: jest.Mock;
  };
  let host: ArgumentsHost;

  beforeEach(() => {
    httpAdapter = {
      getRequestUrl: jest.fn().mockReturnValue('/external_api'),
      getRequestMethod: jest.fn().mockReturnValue('GET'),
      reply: jest.fn(),
      setHeader: jest.fn(),
    };
    const httpAdapterHost = { httpAdapter } as unknown as HttpAdapterHost;
    filter = new GlobalExceptionFilter(httpAdapterHost);

    const response = {};
    const request = {};
    host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    } as unknown as ArgumentsHost;
  });

  it('sets a Retry-After header for ExternalApiUnavailableException', () => {
    const exception = new ExternalApiUnavailableException();

    filter.catch(exception, host);

    expect(httpAdapter.setHeader).toHaveBeenCalledWith(
      expect.anything(),
      'Retry-After',
      '60',
    );
    expect(httpAdapter.reply).toHaveBeenCalledWith(
      expect.anything(),
      exception.getResponse(),
      503,
    );
  });

  it('does not set a Retry-After header for other HttpExceptions', () => {
    const exception = new NotFoundException('Card not found');

    filter.catch(exception, host);

    expect(httpAdapter.setHeader).not.toHaveBeenCalled();
    expect(httpAdapter.reply).toHaveBeenCalledWith(
      expect.anything(),
      exception.getResponse(),
      404,
    );
  });

  it('maps a Prisma error to its status code without leaking the raw message', () => {
    const exception = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed on fields: (email) at /secret/path/to/app.ts',
      { code: 'P2002', clientVersion: '5.0.0' },
    );

    filter.catch(exception, host);

    expect(httpAdapter.reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ statusCode: 409, message: 'Invalid request.' }),
      409,
    );
  });

  it('replaces an unexpected error message with a generic one instead of leaking it', () => {
    const exception = new Error('Cannot read properties of undefined at /secret/path/app.ts:42');

    filter.catch(exception, host);

    expect(httpAdapter.reply).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        statusCode: 500,
        message: 'An unexpected error occurred. Please try again later.',
      }),
      500,
    );
  });
});
