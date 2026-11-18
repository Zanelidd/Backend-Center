import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ExternalApiService } from './external_api.service';

describe('ExternalApiService', () => {
  let service: ExternalApiService;
  let httpService: { get: jest.Mock };

  beforeEach(async () => {
    httpService = { get: jest.fn() };
    const configService = {
      getOrThrow: jest.fn((key: string) =>
        key === 'API_URL' ? 'https://api.pokemontcg.io/v2' : 'test-api-key',
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExternalApiService,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<ExternalApiService>(ExternalApiService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the data on success', async () => {
    httpService.get.mockReturnValue(of({ data: [{ id: 'base1-1' }] }));

    const result = await service.findAll();

    expect(result).toEqual([{ id: 'base1-1' }]);
  });

  it('retries a 502 and returns the data once the API recovers', async () => {
    jest.useFakeTimers();
    httpService.get
      .mockReturnValueOnce(throwError(() => ({ response: { status: 502 } })))
      .mockReturnValueOnce(of({ data: [{ id: 'base1-1' }] }));

    const resultPromise = service.findAll();
    await jest.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual([{ id: 'base1-1' }]);
    expect(httpService.get).toHaveBeenCalledTimes(2);
  });

  it('throws a clean ServiceUnavailableException once retries are exhausted on a persistent 503', async () => {
    jest.useFakeTimers();
    httpService.get.mockReturnValue(
      throwError(() => ({ response: { status: 503 } })),
    );

    const resultPromise = service.findAll();
    const assertion = expect(resultPromise).rejects.toThrow(
      'The Pokémon API is K.O. (too many Trainers at once), not our app! Give it a minute to heal up at the Pokémon Center, then try again.',
    );
    await jest.runAllTimersAsync();
    await assertion;
    expect(httpService.get).toHaveBeenCalledTimes(4); // 1 initial attempt + 3 retries
  });

  it('still returns the clean message when Cloudflare switches from 503 to a plain 500 on the last attempt', async () => {
    jest.useFakeTimers();
    httpService.get
      .mockReturnValueOnce(throwError(() => ({ response: { status: 503 } })))
      .mockReturnValueOnce(throwError(() => ({ response: { status: 503 } })))
      .mockReturnValueOnce(throwError(() => ({ response: { status: 503 } })))
      .mockReturnValueOnce(throwError(() => ({ response: { status: 500 } })));

    const resultPromise = service.findAll();
    const assertion = expect(resultPromise).rejects.toThrow(
      'The Pokémon API is K.O. (too many Trainers at once), not our app! Give it a minute to heal up at the Pokémon Center, then try again.',
    );
    await jest.runAllTimersAsync();
    await assertion;
    expect(httpService.get).toHaveBeenCalledTimes(4);
  });

  it('does not retry a non-retryable error and keeps the specific fallback message', async () => {
    httpService.get.mockReturnValue(
      throwError(() => ({ response: { status: 404 } })),
    );

    await expect(service.findAll()).rejects.toThrow(
      'An error happened while fetching Pokemon sets',
    );
    expect(httpService.get).toHaveBeenCalledTimes(1);
  });
});
