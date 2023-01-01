import { AuthApiClient, DVLA_AUTH } from '@dvsa/ftts-dvla-api-model';
import dayjs from 'dayjs';
import config from '../config';
import { KeyVaultClient } from '../keyVault/keyVaultClient';
import { RotateSecretsError } from './rotateSecretsError';
import { BusinessTelemetryEvent, logger } from '../observability/logger';

export const rotateApiKey = async (keyVaultClient: KeyVaultClient, authApiClient: AuthApiClient): Promise<void> => {
  try {
    logger.info('rotateApiKey: Trying to rotate apiKey');
    await keyVaultClient.setSecret(
      config.keyVault.secretKey.apiKey,
      await changeApiKey(keyVaultClient, authApiClient),
      newApiKeyExpiryDate(),
    );
    logger.logEvent(BusinessTelemetryEvent.ELI_SEC_DVLA_APIKEY_ROTATED, 'Successfully rotated apiKey');
  } catch (error) {
    throw new RotateSecretsError(
      'rotateApiKey: Rotate ApiKey failed',
      error,
    );
  }
};

const changeApiKey = async (keyVaultClient: KeyVaultClient, authApiClient: AuthApiClient): Promise<string> => {
  const changeApiKeyResponse: DVLA_AUTH.ChangeApiKeyResponse = await authApiClient.changeApiKey(
    await keyVaultClient.getSecretValue(config.keyVault.secretKey.apiKey),
    {
      userName: await keyVaultClient.getSecretValue(config.keyVault.secretKey.username),
      password: await keyVaultClient.getSecretValue(config.keyVault.secretKey.password),
    } as DVLA_AUTH.AuthRequest,
  );
  if (!changeApiKeyResponse.newApiKey) {
    throw new Error('changeApiKey: changeApiKeyResponse.newApiKey is not defined');
  }
  return changeApiKeyResponse.newApiKey;
};

const newApiKeyExpiryDate = (): Date => dayjs().add(config.apiKey.daysToExpire, 'day').toDate();
