import { isRetryableHttpError, retryDelayMs, retryWithBackoff } from './retry.util';

describe('isRetryableHttpError', () => {
  it.each([500, 502, 503, 504, 599])('returns true for HTTP %d', (status) => {
    expect(isRetryableHttpError({ response: { status } })).toBe(true);
  });

  it.each([400, 401, 404])('returns false for HTTP %d', (status) => {
    expect(isRetryableHttpError({ response: { status } })).toBe(false);
  });

  it.each(['ECONNABORTED', 'ETIMEDOUT', 'ECONNRESET'])(
    'returns true for network error code %s',
    (code) => {
      expect(isRetryableHttpError({ code })).toBe(true);
    },
  );

  it('returns false when there is nothing to go on', () => {
    expect(isRetryableHttpError(new Error('boom'))).toBe(false);
    expect(isRetryableHttpError(undefined)).toBe(false);
  });
});

describe('retryDelayMs', () => {
  it('doubles the delay on each attempt starting from the base delay', () => {
    expect(retryDelayMs(1, 1000)).toBe(1000);
    expect(retryDelayMs(2, 1000)).toBe(2000);
    expect(retryDelayMs(3, 1000)).toBe(4000);
  });
});

describe('retryWithBackoff', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the result immediately when fn succeeds on the first try', async () => {
    const fn = jest.fn().mockResolvedValue('ok');

    await expect(retryWithBackoff(fn, { baseDelayMs: 1 })).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on a transient error and succeeds once it clears', async () => {
    const fn = jest
      .fn()
      .mockRejectedValueOnce({ response: { status: 502 } })
      .mockRejectedValueOnce({ response: { status: 503 } })
      .mockResolvedValue('ok');
    const onRetry = jest.fn();

    const promise = retryWithBackoff(fn, { retries: 3, baseDelayMs: 1000, onRetry });
    await jest.runAllTimersAsync();

    await expect(promise).resolves.toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenNthCalledWith(1, 1, { response: { status: 502 } });
    expect(onRetry).toHaveBeenNthCalledWith(2, 2, { response: { status: 503 } });
  });

  it('gives up after exhausting retries and rethrows the last error', async () => {
    const error = { response: { status: 503 } };
    const fn = jest.fn().mockRejectedValue(error);

    const promise = retryWithBackoff(fn, { retries: 3, baseDelayMs: 1000 });
    const assertion = expect(promise).rejects.toBe(error);
    await jest.runAllTimersAsync();
    await assertion;
    expect(fn).toHaveBeenCalledTimes(4); // 1 initial attempt + 3 retries
  });

  it('does not retry a non-retryable error', async () => {
    const error = { response: { status: 404 } };
    const fn = jest.fn().mockRejectedValue(error);

    await expect(retryWithBackoff(fn, { retries: 3, baseDelayMs: 1000 })).rejects.toBe(error);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
