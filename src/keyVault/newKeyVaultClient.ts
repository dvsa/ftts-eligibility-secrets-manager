import { SecretClient } from '@azure/keyvault-secrets';
import { ManagedIdentityCredential } from '@dvsa/ftts-auth-client';
import { KeyVaultClient } from './keyVaultClient';
import config from '../config';
import { KeyVaultError } from './keyVaultError';

export function newKeyVaultClient(): KeyVaultClient {
  let vaultUrl;
  try {
    vaultUrl = config.keyVault.uri;
    const secretClient = new SecretClient(
      vaultUrl,
      new ManagedIdentityCredential(config.userAssignedClientId),
    );
    return new KeyVaultClient(
      secretClient,
    );
  } catch (error) {
    throw new KeyVaultError(
      'newKeyVaultClient: Failed to create a new KeyVaultClient',
      error,
      {
        vaultUrl,
      },
    );
  }
}
