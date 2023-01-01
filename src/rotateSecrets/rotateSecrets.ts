import { AzureFunction, Context } from '@azure/functions';
import { AuthApiClient } from '@dvsa/ftts-dvla-api-model';
import { logger } from '../observability/logger';
import handleError from '../error/handleError';
import { secretExpired } from './secretExpired';
import { rotatePassword } from './rotatePassword';
import { rotateApiKey } from './rotateApiKey';
import { KeyVaultClient } from '../keyVault/keyVaultClient';
import { newKeyVaultClient } from '../keyVault/newKeyVaultClient';
import config from '../config';

export const rotateSecrets: AzureFunction = async function rotateSecrets(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context: Context,
): Promise<void> {
  try {
    const keyVaultClient: KeyVaultClient = newKeyVaultClient();

    const authApiClient = AuthApiClient.newAuthApiClient(
      config.dvlaApi.authenticationBaseUri,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (message: string, properties?: Record<string, any>) => {
        logger.info(message, properties);
      },
    );

    if (await secretExpired(keyVaultClient, config.keyVault.secretKey.password, config.password.rotationThreshold)) {
      await rotatePassword(keyVaultClient, authApiClient);
    }

    if (await secretExpired(keyVaultClient, config.keyVault.secretKey.apiKey, config.apiKey.rotationThreshold)) {
      await rotateApiKey(keyVaultClient, authApiClient);
    }
  } catch (error) {
    handleError(error);
  }
};
