import { Logger as AzureLogger } from '@dvsa/azure-logger';
import { Props } from '@dvsa/azure-logger/dist/ILogger';
import config from '../config';

export class Logger extends AzureLogger {
  constructor() {
    super('FTTS', config.appName);
  }

  logEvent(
    telemetryEvent: BusinessTelemetryEvent,
    message?: string,
    properties?: Props,
  ): void {
    super.event(
      telemetryEvent,
      message,
      {
        ...properties,
      },
    );
  }

  logErrorAsEvent(
    telemetryEvent: BusinessTelemetryEvent,
    error: Error,
  ): void {
    this.logEvent(
      telemetryEvent,
      error.message,
      this.getProperties(error),
    );
  }

  getProperties(error: Error): Props | undefined {
    const { properties } = error as unknown as { properties: Props };
    const { cause } = error as unknown as { cause: Error };
    if (!cause) {
      return {
        errorName: error.name,
        ...properties,
      };
    }
    return {
      errorName: error.name,
      ...properties,
      cause: {
        message: cause.message,
        properties: this.getProperties(cause),
      },
    };
  }
}

export enum BusinessTelemetryEvent {
  ELI_SEC_DVLA_SECRET_ROTATION_FAILED = 'ELI_SEC_DVLA_SECRET_ROTATION_FAILED',
  ELI_SEC_DVLA_PASSWORD_ROTATED = 'ELI_SEC_DVLA_PASSWORD_ROTATED',
  ELI_SEC_DVLA_APIKEY_ROTATED = 'ELI_SEC_DVLA_APIKEY_ROTATED',
  NOT_WHITELISTED_URL_CALL = 'NOT_WHITELISTED_URL_CALL',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  HEALTH_CHECK_SUCCESS = 'HEALTH_CHECK_SUCCESS',
}

export const logger = new Logger();
