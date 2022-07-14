import { AuthApiClient } from '@dvsa/ftts-dvla-api-model';
import dayjs from 'dayjs';
import config from '../config';
import { KeyVaultClient } from '../keyVault/keyVaultClient';
import { generatePassword } from './generatePassword';
import { RotateSecretsError } from './rotateSecretsError';
import { BusinessTelemetryEvent, logger } from '../observability/logger';

export const rotatePassword = async (
  keyVaultClient: KeyVaultClient,
  authApiClient: AuthApiClient,
): Promise<void> => {
  try {
    logger.info('rotatePassword: Trying to rotate password');
    const newPassword = generatePassword();
    await authApiClient.changePassword({
      userName: await keyVaultClient.getSecretValue(config.keyVault.secretKey.username),
      password: await keyVaultClient.getSecretValue(config.keyVault.secretKey.password),
      newPassword,
    });
    await keyVaultClient.setSecret(
      config.keyVault.secretKey.password,
      newPassword,
      dayjs().add(config.password.daysToExpire, 'day').toDate(),
    );
    logger.logEvent(BusinessTelemetryEvent.ELI_SEC_DVLA_PASSWORD_ROTATED);
  } catch (error) {
    throw new RotateSecretsError(
      'rotatePassword: Rotate password failed',
      error,
    );
  }
};
