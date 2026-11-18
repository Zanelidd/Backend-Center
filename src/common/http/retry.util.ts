export const RETRYABLE_ERROR_CODES = new Set([
  'ECONNABORTED',
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

export const DEFAULT_RETRY_ATTEMPTS = 3;
export const DEFAULT_RETRY_BASE_DELAY_MS = 1000;

export const EXTERNAL_API_UNAVAILABLE_MESSAGE =
  'The Pokémon API is K.O. (too many Trainers at once), not our app! Give it a minute to heal up at the Pokémon Center, then try again.';

export const EXTERNAL_API_RETRY_AFTER_SECONDS = 60;

interface AxiosLikeError {
  code?: string;
  message?: string;
  response?: { status?: number };
}

export function isRetryableHttpError(error: unknown): boolean {
  const { code, response } = (error ?? {}) as AxiosLikeError;
  if (response?.status !== undefined) {
    return response.status >= 500 && response.status <= 599;
  }
  return typeof code === 'string' && RETRYABLE_ERROR_CODES.has(code);
}

export function describeHttpError(error: unknown): string {
  const { code, response, message } = (error ?? {}) as AxiosLikeError;
  if (response?.status !== undefined) return `HTTP ${response.status}`;
  if (code) return code;
  return message ?? 'unknown error';
}

export function retryDelayMs(
  attempt: number,
  baseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
): number {
  return baseDelayMs * 2 ** (attempt - 1);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  onRetry?: (attempt: number, error: unknown) => void;
}

/** Only safe for idempotent calls (GET) — retrying would duplicate side effects on a write. */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    retries = DEFAULT_RETRY_ATTEMPTS,
    baseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
    onRetry,
  } = options;

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (!isRetryableHttpError(error) || attempt > retries) {
        throw error;
      }
      onRetry?.(attempt, error);
      await sleep(retryDelayMs(attempt, baseDelayMs));
    }
  }
  throw new Error('retryWithBackoff: unreachable');
}
