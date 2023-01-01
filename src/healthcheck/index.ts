import { Context, HttpRequest } from '@azure/functions';
import { httpTriggerContextWrapper } from '@dvsa/azure-logger';
import { withEgressFiltering } from '@dvsa/egress-filtering';
import { Role, withRolesValidation } from '@dvsa/ftts-role-validation';
import { ALLOWED_ADDRESSES, ON_INTERNAL_ACCESS_DENIED_ERROR } from '../egress';
import { logger } from '../observability/logger';
import { httpTrigger } from './httpTrigger';

export const index = async (context: Context, httpRequest: HttpRequest): Promise<void> => httpTriggerContextWrapper(
  withRolesValidation(
    withEgressFiltering(
      httpTrigger,
      ALLOWED_ADDRESSES(),
      ON_INTERNAL_ACCESS_DENIED_ERROR,
      logger,
    ),
    true,
    [Role.OPERATIONS_HEALTHCHECK_READ],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (error: Error, message?: string, properties?: Record<string, any>): void => logger.error(error, message, properties),
  ),
  context,
  httpRequest,
);
