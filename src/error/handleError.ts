import { BusinessTelemetryEvent, logger } from '../observability/logger';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function handleError(error: any): void {
  logger.logErrorAsEvent(
    BusinessTelemetryEvent.ELI_SEC_DVLA_SECRET_ROTATION_FAILED,
    error,
  );
  logger.error(error);
  throw error;
}
