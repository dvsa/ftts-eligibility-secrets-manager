import each from 'jest-each';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { SecretClient, KeyVaultSecret } from '@azure/keyvault-secrets';
import { AuthApiClient, DVLA_AUTH } from '@dvsa/ftts-dvla-api-model';
import MockDate from 'mockdate';
import { KeyVaultClient } from '../../../src/keyVault/keyVaultClient';
import { rotateApiKey } from '../../../src/rotateSecrets/rotateApiKey';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { RotateSecretsError } from '../../../src/rotateSecrets/rotateSecretsError';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';

jest.mock('../../../src/observability/logger');
jest.mock('../../../src/config');
jest.mock('@azure/keyvault-secrets');
jest.mock('@dvsa/ftts-dvla-api-model');

const mockedSecretClient = mock<SecretClient>();
const mockedAuthApiClient = mock<AuthApiClient>();

const TODAY = '2021-04-06T16:45:00.000Z';
const EXPIRY_DATE = '2021-04-16T16:45:00.000Z';
const DAYS_TO_EXPIRE = 10;

describe('rotateApiKey', () => {
  let keyVaultClient: KeyVaultClient;

  beforeEach(() => {
    keyVaultClient = new KeyVaultClient(
      mockedSecretClient,
    );
    mockedConfig.keyVault.secretKey.username = 'USERNAME';
    mockedConfig.keyVault.secretKey.password = 'PASSWORD';
    mockedConfig.keyVault.secretKey.apiKey = 'API_KEY';
    mockedConfig.apiKey.daysToExpire = DAYS_TO_EXPIRE;
    MockDate.set(TODAY);
    jest.clearAllMocks();
  });

  each([
    [
      'username',
      'passwd',
      'FWER@#$@',
      '%$##$%%^',
    ],
  ]).test('GIVEN a keyVaultClient AND an AuthApiClient WHEN called THEN the apiKey is rotated', async (
    username: string,
    password: string,
    oldApiKey: string,
    newApiKey: string,
  ) => {
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.username)
      .mockResolvedValue({
        value: username,
      } as KeyVaultSecret);
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.password)
      .mockResolvedValue({
        value: password,
      } as KeyVaultSecret);
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.apiKey)
      .mockResolvedValue({
        value: oldApiKey,
      } as KeyVaultSecret);
    when(mockedAuthApiClient.changeApiKey)
      .calledWith(oldApiKey, {
        userName: username,
        password,
      })
      .mockResolvedValue({
        newApiKey,
      } as DVLA_AUTH.ChangeApiKeyResponse);
    when(mockedSecretClient.setSecret)
      .calledWith(
        mockedConfig.keyVault.secretKey.apiKey,
        newApiKey,
        {
          expiresOn: new Date(EXPIRY_DATE),
        },
      )
      .mockResolvedValue({
        value: newApiKey,
      } as KeyVaultSecret);

    await rotateApiKey(keyVaultClient, mockedAuthApiClient);

    expect(mockedSecretClient.setSecret).toHaveBeenCalledTimes(1);
    expect(mockedSecretClient.setSecret).toHaveBeenCalledWith(
      mockedConfig.keyVault.secretKey.apiKey,
      newApiKey,
      {
        expiresOn: new Date(EXPIRY_DATE),
      },
    );
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'rotateApiKey: Trying to rotate apiKey',
    );
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(BusinessTelemetryEvent.ELI_SEC_DVLA_APIKEY_ROTATED, 'Successfully rotated apiKey');
  });

  each([
    [
      'username',
      'passwd',
      'FWER@#$@',
      undefined,
    ],
  ]).test('GIVEN a keyVaultClient AND an AuthApiClient WHEN called BUT newApiKey is not defined THEN an error is thrown', async (
    username: string,
    password: string,
    oldApiKey: string,
    newApiKey: string,
  ) => {
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.username)
      .mockResolvedValue({
        value: username,
      } as KeyVaultSecret);
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.password)
      .mockResolvedValue({
        value: password,
      } as KeyVaultSecret);
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.apiKey)
      .mockResolvedValue({
        value: oldApiKey,
      } as KeyVaultSecret);
    when(mockedAuthApiClient.changeApiKey)
      .calledWith(oldApiKey, {
        userName: username,
        password,
      })
      .mockResolvedValue({
        newApiKey,
      } as DVLA_AUTH.ChangeApiKeyResponse);
    when(mockedSecretClient.setSecret)
      .calledWith(
        mockedConfig.keyVault.secretKey.apiKey,
        newApiKey,
        {
          expiresOn: new Date(EXPIRY_DATE),
        },
      )
      .mockResolvedValue({
        value: newApiKey,
      } as KeyVaultSecret);

    try {
      await rotateApiKey(keyVaultClient, mockedAuthApiClient);
    } catch (error) {
      expect(error).toBeInstanceOf(RotateSecretsError);
      expect(error.message).toBe('rotateApiKey: Rotate ApiKey failed');
      expect(error.cause.message).toBe('changeApiKey: changeApiKeyResponse.newApiKey is not defined');
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'rotateApiKey: Trying to rotate apiKey',
      );
    }
  });

  each([
    [
      'username',
      'passwd',
      'FWER@#$@',
    ],
  ]).test('GIVEN a keyVaultClient AND an AuthApiClient WHEN called BUT newApiKey is not defined THEN an error is thrown', async (
    username: string,
    password: string,
    oldApiKey: string,
  ) => {
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.username)
      .mockResolvedValue({
        value: username,
      } as KeyVaultSecret);
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.password)
      .mockResolvedValue({
        value: password,
      } as KeyVaultSecret);
    when(mockedSecretClient.getSecret)
      .calledWith(mockedConfig.keyVault.secretKey.apiKey)
      .mockResolvedValue({
        value: oldApiKey,
      } as KeyVaultSecret);
    when(mockedAuthApiClient.changeApiKey)
      .calledWith(oldApiKey, {
        userName: username,
        password,
      })
      .mockRejectedValue(new Error('err msg'));

    try {
      await rotateApiKey(keyVaultClient, mockedAuthApiClient);
    } catch (error) {
      expect(error).toBeInstanceOf(RotateSecretsError);
      expect(error.message).toBe('rotateApiKey: Rotate ApiKey failed');
      expect(error.cause.message).toBe('err msg');
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'rotateApiKey: Trying to rotate apiKey',
      );
    }
  });
});
