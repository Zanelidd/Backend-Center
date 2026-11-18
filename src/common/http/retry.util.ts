export const RETRYABLE_HTTP_STATUS_CODES = [502, 503, 504];
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
  'Service externe temporairement indisponible, réessayez plus tard.';

interface AxiosLikeError {
  code?: string;
  message?: string;
  response?: { status?: number };
}

/** True for transient upstream errors (502/503/504, timeout, connection reset) worth retrying. */
export function isRetryableHttpError(error: unknown): boolean {
  const { code, response } = (error ?? {}) as AxiosLikeError;
  if (response?.status !== undefined) {
    return RETRYABLE_HTTP_STATUS_CODES.includes(response.status);
  }
  return typeof code === 'string' && RETRYABLE_ERROR_CODES.has(code);
}

/** Short, log-safe description of an HTTP error (no response body, no stack). */
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

/**
 * Retries `fn` on transient upstream errors (502/503/504/timeout) with exponential
 * backoff (1s/2s/4s by default). Non-retryable errors are rethrown immediately.
 */
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
