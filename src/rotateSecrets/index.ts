import { Context, HttpRequest } from '@azure/functions';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { withEgressFiltering } from '@dvsa/egress-filtering';
import { ALLOWED_ADDRESSES, ON_INTERNAL_ACCESS_DENIED_ERROR } from '../egress';
import { rotateSecrets } from './rotateSecrets';
import { logger } from '../observability/logger';

export const index = async (context: Context, req: HttpRequest): Promise<void> => nonHttpTriggerContextWrapper(
  withEgressFiltering(rotateSecrets, ALLOWED_ADDRESSES(), ON_INTERNAL_ACCESS_DENIED_ERROR, logger),
  context,
  req,
);
