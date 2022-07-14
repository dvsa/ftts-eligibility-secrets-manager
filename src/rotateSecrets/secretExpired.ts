import dayjs from 'dayjs';
import { KeyVaultClient } from '../keyVault/keyVaultClient';
import { logger } from '../observability/logger';

export async function secretExpired(
  keyVaultClient: KeyVaultClient,
  secretName: string,
  threshold: number,
): Promise<boolean> {
  logger.info('rotateSecrets: Trying to verify secret expiration date', { secretName });
  const secretExpirationDate = await keyVaultClient.getSecretExpirationDate(secretName);
  if (!secretExpirationDate) {
    logger.info('rotateSecrets: No secret expiration date', { secretName });
    return true;
  }
  const expired = dayjs(secretExpirationDate).diff(dayjs(), 'day') < threshold;
  if (expired) {
    logger.info('rotateSecrets: Secret expired', { secretName, secretExpirationDate: dayjs(secretExpirationDate).toISOString() });
  } else {
    logger.info('rotateSecrets: Secret is valid', { secretName, secretExpirationDate: dayjs(secretExpirationDate).toISOString() });
  }
  return expired;
}
