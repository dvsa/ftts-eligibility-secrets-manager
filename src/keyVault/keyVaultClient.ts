import { SecretClient } from '@azure/keyvault-secrets';
import { KeyVaultError } from './keyVaultError';

export class KeyVaultClient {
  constructor(
    private secretClient: SecretClient,
  ) {}

  public async getSecretValue(secretName: string): Promise<string> {
    try {
      const keyVaultSecret = await this.secretClient.getSecret(secretName);
      if (keyVaultSecret.value === undefined) {
        throw new Error('KeyVaultClient::getSecretValue: keyValueSecret.value is not defined');
      }
      return keyVaultSecret.value;
    } catch (error) {
      throw new KeyVaultError(
        'KeyVaultClient::getSecretValue: Failed to get a secret value',
        error,
        {
          secretName,
        },
      );
    }
  }

  public async setSecret(secretName: string, secretValue: string, expiresOn?: Date): Promise<string> {
    try {
      const keyVaultSecret = await this.secretClient.setSecret(secretName, secretValue, {
        expiresOn,
      });
      if (keyVaultSecret.value === undefined) {
        throw new Error('KeyVaultClient::setSecret: keyValueSecret.value is not defined');
      }
      return keyVaultSecret.value;
    } catch (error) {
      throw new KeyVaultError(
        'KeyVaultClient::setSecret: Failed to set a secret',
        error,
        {
          secretName,
        },
      );
    }
  }

  public async getSecretExpirationDate(secretName: string): Promise<Date | undefined> {
    try {
      const keyVaultSecret = await this.secretClient.getSecret(secretName);
      return keyVaultSecret.properties.expiresOn;
    } catch (error) {
      throw new KeyVaultError(
        'KeyVaultClient::getSecretExpirationDate: Failed to get a secret expiration date',
        error,
        {
          secretName,
        },
      );
    }
  }
}
