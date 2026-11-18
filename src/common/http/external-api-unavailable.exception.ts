import { ServiceUnavailableException } from '@nestjs/common';
import {
  EXTERNAL_API_RETRY_AFTER_SECONDS,
  EXTERNAL_API_UNAVAILABLE_MESSAGE,
} from './retry.util';

/**
 * Thrown once retries on an external API call are exhausted. Carries
 * `retryAfterSeconds` so the global exception filter can set a `Retry-After`
 * header, instead of just a generic "try again later" with no actual delay.
 */
export class ExternalApiUnavailableException extends ServiceUnavailableException {
  readonly retryAfterSeconds = EXTERNAL_API_RETRY_AFTER_SECONDS;

  constructor(message: string = EXTERNAL_API_UNAVAILABLE_MESSAGE) {
    super(message);
  }
}
