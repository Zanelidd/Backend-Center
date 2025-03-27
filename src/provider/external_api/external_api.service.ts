import { Injectable, Logger, Param } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import type { Card, Set } from 'pokemon-tcg-sdk-typescript/dist/sdk';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);

  constructor(private readonly httpService: HttpService) {}

  async findAll(): Promise<Array<Set>> {
    const { data } = await firstValueFrom(
      this.httpService.get(`${process.env.API_URL}/sets`).pipe(
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
        .get(`${process.env.API_URL}/cards`, {
          params: { q: `name:${name}` },
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
        .get(`${process.env.API_URL}/cards`, {
          params: { q: `set.id:${setId}` },
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

  async findOne(@Param('id') id: string) {
    const response = await firstValueFrom(
      this.httpService.get(`${process.env.API_URL}/cards/${id}`).pipe(
        catchError((error: AxiosError) => {
          this.logger.error(error.response?.data);
          throw new Error();
        }),
      ),
    );
    return response.data;
  }
}
