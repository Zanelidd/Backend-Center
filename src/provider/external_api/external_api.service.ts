import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import type { Card, Set } from 'pokemon-tcg-sdk-typescript/dist/sdk';
import { PokemonTCG } from 'pokemon-tcg-sdk-typescript';

@Injectable()
export class ExternalApiService {
  private readonly logger = new Logger(ExternalApiService.name);
  private externalApiService: ExternalApiService;
  constructor(private readonly httpService: HttpService) {}

  async findAll(): Promise<Array<Set>> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.get(`${process.env.API_URL}/sets`).pipe(
          catchError((error: AxiosError) => {
            this.logger.error(error.response?.data);
            throw new Error('An error happened while fetching Pokemon sets');
          }),
        ),
      );
      return data;
    } catch (error) {
      throw error;
    }
  }

  async findMany(name: string): Promise<Array<Card>> {
    try {
      return await PokemonTCG.findCardsByQueries({
        q: `name:${name}`,
      });
    } catch (error) {
      throw error;
    }
  }

  //async findOne(@Param('id') id: string): Promise<ExternalApiService> {}
}
