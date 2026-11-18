import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import type { Card, Set } from 'pokemon-tcg-sdk-typescript/dist/sdk';
import {
  DEFAULT_RETRY_ATTEMPTS,
  describeHttpError,
  isRetryableHttpError,
  retryWithBackoff,
} from '../../common/http/retry.util';
import { ExternalApiUnavailableException } from '../../common/http/external-api-unavailable.exception';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.getOrThrow<string>('API_URL');
    this.apiKey = this.configService.getOrThrow<string>('TCG_API_KEY');
  }

  async findAll(): Promise<Array<Set>> {
    return this.get<Array<Set>>(
      '/sets',
      undefined,
      'An error happened while fetching Pokemon sets',
    );
  }

  async findMany(name: string): Promise<Array<Card>> {
    return this.get<Array<Card>>(
      '/cards',
      { q: `name:${name}` },
      'An error happened while fetching Cards',
    );
  }

  async findManyBySet(setId: string): Promise<Array<Card>> {
    return this.get<Array<Card>>(
      '/cards',
      { q: `set.id:${setId}` },
      'An error happened while fetching Pokemon set',
    );
  }

  async findOne(id: string): Promise<Card> {
    return this.get<Card>(
      `/cards/${id}`,
      undefined,
      'An error happened while fetching the card',
    );
  }

  async findManyByQuery(q: string, pageSize: number): Promise<Array<Card>> {
    return this.get<Array<Card>>(
      '/cards',
      { q, pageSize: String(pageSize) },
      "An error happened while fetching your collection's cards",
    );
  }

  private async get<T>(
    path: string,
    params: Record<string, string> | undefined,
    fallbackMessage: string,
  ): Promise<T> {
    const config: AxiosRequestConfig = {
      headers: { 'x-Api-Key': this.apiKey },
      ...(params ? { params } : {}),
    };

    try {
      const response = await retryWithBackoff(
        () =>
          firstValueFrom(
            this.httpService.get<{ data: T }>(`${this.apiUrl}${path}`, config),
          ),
        {
          onRetry: (attempt, error) =>
            this.logger.warn(
              `Retry ${attempt}/${DEFAULT_RETRY_ATTEMPTS} on GET ${path} (${describeHttpError(error)})`,
            ),
        },
      );
      if (response.data?.data === undefined) {
        throw new Error(
          `Unexpected response shape from the Pokemon TCG API on GET ${path}`,
        );
      }
      return response.data.data;
    } catch (error) {
      if (isRetryableHttpError(error)) {
        this.logger.error(
          `Pokemon TCG API unavailable after ${DEFAULT_RETRY_ATTEMPTS} retries on GET ${path} (${describeHttpError(error)})`,
        );
        throw new ExternalApiUnavailableException();
      }
      this.logger.error(`${fallbackMessage} (${describeHttpError(error)})`);
      const status = (error as { response?: { status?: number } })?.response
        ?.status;
      if (status === 404) {
        throw new NotFoundException(fallbackMessage);
      }
      if (status === 400) {
        throw new BadRequestException(fallbackMessage);
      }
      throw new Error(fallbackMessage);
    }
  }
}
