import { SecretClient } from '@azure/keyvault-secrets';
import { ManagedIdentityCredential } from '@dvsa/ftts-auth-client';
import { mockedConfig } from '../../mocks/config.mock';
import { newKeyVaultClient } from '../../../src/keyVault/newKeyVaultClient';
import { KeyVaultClient } from '../../../src/keyVault/keyVaultClient';
import { KeyVaultError } from '../../../src/keyVault/keyVaultError';

jest.mock('@azure/keyvault-secrets');
jest.mock('@dvsa/ftts-auth-client');
jest.mock('../../../src/keyVault/keyVaultClient');
jest.mock('../../../src/config');

const KV_URI = 'https://kVaultName.vault.azure.net';

describe('newKeyVaultClient', () => {
  beforeEach(() => {
    mockedConfig.keyVault.uri = KV_URI;
    mockedConfig.userAssignedClientId = 'clientId';

    jest.clearAllMocks();
  });

  test('GIVEN no errors WHEN called THEN a new KeyVaultClient instance is returned', () => {
    const keyVaultClient = newKeyVaultClient();

    expect(keyVaultClient).toBeInstanceOf(KeyVaultClient);
    expect(SecretClient).toHaveBeenCalledTimes(1);
    expect(SecretClient).toHaveBeenCalledWith(
      KV_URI,
      expect.any(ManagedIdentityCredential),
    );

    expect(KeyVaultClient).toHaveBeenCalledTimes(1);
    expect(KeyVaultClient).toHaveBeenCalledWith(
      expect.any(SecretClient),
    );
    expect(ManagedIdentityCredential).toHaveBeenCalledTimes(1);
    expect(ManagedIdentityCredential).toHaveBeenCalledWith(
      mockedConfig.userAssignedClientId,
    );
  });

  test('GIVEN an error WHEN called THEN a KeyVaultError is thrown', () => {
    const expectedError = new Error('msg');
    mockedConfig.keyVault = new Proxy(
      mockedConfig.keyVault,
      {
        // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
        get(target, property) {
          if (property === 'uri') {
            throw expectedError;
          }
          return Reflect.get(target, property);
        },
      },
    );
    const keyVaultError = new KeyVaultError('newKeyVaultClient: Failed to create a new KeyVaultClient', expectedError);

    expect(() => newKeyVaultClient()).toThrow(keyVaultError);
  });
});
