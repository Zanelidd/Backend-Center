export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Consecutive failures before the circuit opens. */
  failureThreshold?: number;
  /** How long the circuit stays open before allowing one trial call. */
  cooldownMs?: number;
}

/**
 * Minimal in-memory circuit breaker: after `failureThreshold` consecutive
 * failures it opens and fails fast (no HTTP call, no retry cycle) for
 * `cooldownMs`, then lets exactly one trial call through (HALF_OPEN) before
 * deciding whether to close or reopen. Meant to be held as a singleton field
 * on the service guarding a single external dependency.
 */
export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private consecutiveFailures = 0;
  private openedAt: number | null = null;

  private readonly failureThreshold: number;
  private readonly cooldownMs: number;

  constructor({
    failureThreshold = 3,
    cooldownMs = 60_000,
  }: CircuitBreakerOptions = {}) {
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
  }

  getState(): CircuitState {
    return this.state;
  }

  /** Whether a call should be attempted right now. */
  canAttempt(): boolean {
    if (this.state !== CircuitState.OPEN) {
      return true;
    }
    if (Date.now() - (this.openedAt ?? 0) < this.cooldownMs) {
      return false;
    }
    this.state = CircuitState.HALF_OPEN;
    return true;
  }

  recordSuccess(): void {
    this.state = CircuitState.CLOSED;
    this.consecutiveFailures = 0;
    this.openedAt = null;
  }

  recordFailure(): void {
    this.consecutiveFailures += 1;
    if (
      this.state === CircuitState.HALF_OPEN ||
      this.consecutiveFailures >= this.failureThreshold
    ) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
    }
  }
}
