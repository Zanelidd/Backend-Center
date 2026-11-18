import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig } from 'axios';
import type { Card, Set } from 'pokemon-tcg-sdk-typescript/dist/sdk';
import {
  DEFAULT_RETRY_ATTEMPTS,
  EXTERNAL_API_UNAVAILABLE_MESSAGE,
  describeHttpError,
  isRetryableHttpError,
  retryWithBackoff,
} from '../../common/http/retry.util';

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

  /**
   * GET helper shared by all endpoints: retries transient 502/503/504/timeout
   * errors with backoff, then maps a still-failing call to a clean, user-safe
   * error instead of leaking the raw axios error to the client.
   */
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
        () => firstValueFrom(this.httpService.get<T>(`${this.apiUrl}${path}`, config)),
        {
          onRetry: (attempt, error) =>
            this.logger.warn(
              `Retry ${attempt}/${DEFAULT_RETRY_ATTEMPTS} on GET ${path} (${describeHttpError(error)})`,
            ),
        },
      );
      return response.data;
    } catch (error) {
      if (isRetryableHttpError(error)) {
        this.logger.error(
          `Pokemon TCG API unavailable after ${DEFAULT_RETRY_ATTEMPTS} retries on GET ${path} (${describeHttpError(error)})`,
        );
        throw new ServiceUnavailableException(EXTERNAL_API_UNAVAILABLE_MESSAGE);
      }
      this.logger.error(`${fallbackMessage} (${describeHttpError(error)})`);
      throw new Error(fallbackMessage);
    }
  }
}
