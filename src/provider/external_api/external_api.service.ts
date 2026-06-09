import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import type { Card, Set } from 'pokemon-tcg-sdk-typescript/dist/sdk';

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
    const { data } = await firstValueFrom(
      this.httpService
        .get(`${this.apiUrl}/sets`, {
          headers: { 'x-Api-Key': this.apiKey },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new Error('An error happened while fetching Pokemon sets');
          }),
        ),
    );
    return data;
  }

  async findMany(name: string): Promise<Array<Card>> {
    const { data } = await firstValueFrom(
      this.httpService
        .get(`${this.apiUrl}/cards`, {
          params: { q: `name:${name}` },
          headers: { 'x-Api-Key': this.apiKey },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new Error('An error happened while fetching Cards');
          }),
        ),
    );
    return data;
  }

  async findManyBySet(setId: string): Promise<Array<Card>> {
    const { data } = await firstValueFrom(
      this.httpService
        .get(`${this.apiUrl}/cards`, {
          params: { q: `set.id:${setId}` },
          headers: { 'x-Api-Key': this.apiKey },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new Error('An error happened while fetching Pokemon set');
          }),
        ),
    );
    return data;
  }

  async findOne(id: string) {
    const response = await firstValueFrom(
      this.httpService
        .get(`${this.apiUrl}/cards/${id}`, {
          headers: { 'x-Api-Key': this.apiKey },
        })
        .pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new Error('An error happened while fetching the card');
          }),
        ),
    );
    return response.data;
  }
}
