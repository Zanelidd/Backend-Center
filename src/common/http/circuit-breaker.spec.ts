import { CircuitBreaker, CircuitState } from './circuit-breaker';

describe('CircuitBreaker', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('starts CLOSED and allows calls', () => {
    const breaker = new CircuitBreaker();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.canAttempt()).toBe(true);
  });

  it('stays CLOSED and resets the failure count on success between failures', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordSuccess();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.canAttempt()).toBe(true);
  });

  it('opens after reaching the failure threshold and rejects calls', () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    breaker.recordFailure();
    breaker.recordFailure();
    breaker.recordFailure();

    expect(breaker.getState()).toBe(CircuitState.OPEN);
    expect(breaker.canAttempt()).toBe(false);
  });

  it('moves to HALF_OPEN and allows one trial call once the cooldown elapses', () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 60_000,
    });

    breaker.recordFailure();
    expect(breaker.canAttempt()).toBe(false);

    jest.setSystemTime(Date.now() + 60_000);

    expect(breaker.canAttempt()).toBe(true);
    expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
  });

  it('closes on a successful HALF_OPEN trial', () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 60_000,
    });

    breaker.recordFailure();
    jest.setSystemTime(Date.now() + 60_000);
    breaker.canAttempt();
    breaker.recordSuccess();

    expect(breaker.getState()).toBe(CircuitState.CLOSED);
    expect(breaker.canAttempt()).toBe(true);
  });

  it('reopens immediately (fresh cooldown) if the HALF_OPEN trial fails', () => {
    jest.useFakeTimers();
    const breaker = new CircuitBreaker({
      failureThreshold: 1,
      cooldownMs: 60_000,
    });

    breaker.recordFailure();
    jest.setSystemTime(Date.now() + 60_000);
    breaker.canAttempt();
    breaker.recordFailure();

    expect(breaker.getState()).toBe(CircuitState.OPEN);
    expect(breaker.canAttempt()).toBe(false);
  });
});
