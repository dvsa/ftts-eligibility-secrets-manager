import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { AuthApiClient } from '@dvsa/ftts-dvla-api-model';
import handleError from '../../../src/error/handleError';
import { newKeyVaultClient } from '../../../src/keyVault/newKeyVaultClient';
import { KeyVaultClient } from '../../../src/keyVault/keyVaultClient';
import { rotateApiKey } from '../../../src/rotateSecrets/rotateApiKey';
import { rotatePassword } from '../../../src/rotateSecrets/rotatePassword';
import { rotateSecrets } from '../../../src/rotateSecrets/rotateSecrets';
import { secretExpired } from '../../../src/rotateSecrets/secretExpired';
import { RotateSecretsError } from '../../../src/rotateSecrets/rotateSecretsError';
import { mockedContext } from '../../mocks/context.mock';
import { mockedConfig } from '../../mocks/config.mock';

jest.mock('../../../src/observability/logger');
jest.mock('../../../src/config');
jest.mock('@dvsa/ftts-dvla-api-model');

jest.mock('../../../src/keyVault/newKeyVaultClient');
const mockedNewKeyVaultClient = jest.mocked(newKeyVaultClient, true);

jest.mock('../../../src/keyVault/keyVaultClient');
const mockedKeyVaultClient = mock<KeyVaultClient>();

jest.mock('../../../src/rotateSecrets/secretExpired');
const mockedsecretExpired = jest.mocked(secretExpired, true);

jest.mock('../../../src/rotateSecrets/rotatePassword');
const mockedRotatePassword = jest.mocked(rotatePassword, true);

jest.mock('../../../src/rotateSecrets/rotateApiKey');
const mockedRotateApiKey = jest.mocked(rotateApiKey, true);

jest.mock('../../../src/error/handleError');
const mockedHandleError = jest.mocked(handleError, true);

const dvlaAuthUrl = 'https://auth';
const password = 'password';
const apiKey = 'apiKey';
const passwordThreshold = 14;
const apiKeyThreshold = 15;

describe('rotateSecrets', () => {
  beforeEach(() => {
    mockedConfig.dvlaApi.authenticationBaseUri = dvlaAuthUrl;
    mockedConfig.keyVault.secretKey.password = password;
    mockedConfig.keyVault.secretKey.apiKey = apiKey;
    mockedConfig.password.rotationThreshold = passwordThreshold;
    mockedConfig.apiKey.rotationThreshold = apiKeyThreshold;
    jest.resetAllMocks();
  });

  test('GIVEN context WHEN both secrets are expired THEN rotate password and api key', async () => {
    mockedNewKeyVaultClient.mockReturnValue(mockedKeyVaultClient);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, password, passwordThreshold)
      .mockResolvedValue(true);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, apiKey, apiKeyThreshold)
      .mockResolvedValue(true);

    await rotateSecrets(mockedContext);

    expect(newKeyVaultClient).toHaveBeenCalledTimes(1);
    expect(AuthApiClient.newAuthApiClient).toHaveBeenCalledTimes(1);
    expect(mockedsecretExpired).toHaveBeenCalledTimes(2);
    expect(mockedRotatePassword).toHaveBeenCalledTimes(1);
    expect(mockedRotateApiKey).toHaveBeenCalledTimes(1);
    expect(mockedHandleError).toHaveBeenCalledTimes(0);
  });

  test('GIVEN context WHEN only password is expired THEN rotate password', async () => {
    mockedNewKeyVaultClient.mockReturnValue(mockedKeyVaultClient);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, password, passwordThreshold)
      .mockResolvedValue(true);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, apiKey, apiKeyThreshold)
      .mockResolvedValue(false);

    await rotateSecrets(mockedContext);

    expect(newKeyVaultClient).toHaveBeenCalledTimes(1);
    expect(AuthApiClient.newAuthApiClient).toHaveBeenCalledTimes(1);
    expect(mockedsecretExpired).toHaveBeenCalledTimes(2);
    expect(mockedRotatePassword).toHaveBeenCalledTimes(1);
    expect(mockedRotateApiKey).toHaveBeenCalledTimes(0);
    expect(mockedHandleError).toHaveBeenCalledTimes(0);
  });

  test('GIVEN context WHEN only apiKey is expired THEN rotate apiKey', async () => {
    mockedNewKeyVaultClient.mockReturnValue(mockedKeyVaultClient);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, password, passwordThreshold)
      .mockResolvedValue(false);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, apiKey, apiKeyThreshold)
      .mockResolvedValue(true);

    await rotateSecrets(mockedContext);

    expect(newKeyVaultClient).toHaveBeenCalledTimes(1);
    expect(AuthApiClient.newAuthApiClient).toHaveBeenCalledTimes(1);
    expect(mockedsecretExpired).toHaveBeenCalledTimes(2);
    expect(mockedRotatePassword).toHaveBeenCalledTimes(0);
    expect(mockedRotateApiKey).toHaveBeenCalledTimes(1);
    expect(mockedHandleError).toHaveBeenCalledTimes(0);
  });

  test('GIVEN context WHEN both secrets are not expired THEN no secret is rotated', async () => {
    mockedNewKeyVaultClient.mockReturnValue(mockedKeyVaultClient);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, password, passwordThreshold)
      .mockResolvedValue(false);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, apiKey, apiKeyThreshold)
      .mockResolvedValue(false);

    await rotateSecrets(mockedContext);

    expect(newKeyVaultClient).toHaveBeenCalledTimes(1);
    expect(AuthApiClient.newAuthApiClient).toHaveBeenCalledTimes(1);
    expect(mockedsecretExpired).toHaveBeenCalledTimes(2);
    expect(mockedRotatePassword).toHaveBeenCalledTimes(0);
    expect(mockedRotateApiKey).toHaveBeenCalledTimes(0);
    expect(mockedHandleError).toHaveBeenCalledTimes(0);
  });

  test('GIVEN context WHEN secretExpired fails THEN handle error', async () => {
    mockedNewKeyVaultClient.mockReturnValue(mockedKeyVaultClient);
    const expectedError = new Error('wrong');
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, password, passwordThreshold)
      .mockImplementation(() => { throw expectedError; });

    await rotateSecrets(mockedContext);

    expect(newKeyVaultClient).toHaveBeenCalledTimes(1);
    expect(AuthApiClient.newAuthApiClient).toHaveBeenCalledTimes(1);
    expect(mockedsecretExpired).toHaveBeenCalledTimes(1);
    expect(mockedRotatePassword).toHaveBeenCalledTimes(0);
    expect(mockedRotateApiKey).toHaveBeenCalledTimes(0);
    expect(mockedHandleError).toHaveBeenCalledTimes(1);
    expect(mockedHandleError).toHaveBeenCalledWith(expectedError);
  });

  test('GIVEN context WHEN rotate password fails THEN handle error', async () => {
    mockedNewKeyVaultClient.mockReturnValue(mockedKeyVaultClient);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, password, passwordThreshold)
      .mockResolvedValue(true);
    const expectedError = new RotateSecretsError('wrong');
    mockedRotatePassword.mockImplementation(() => { throw expectedError; });

    await rotateSecrets(mockedContext);

    expect(newKeyVaultClient).toHaveBeenCalledTimes(1);
    expect(AuthApiClient.newAuthApiClient).toHaveBeenCalledTimes(1);
    expect(mockedsecretExpired).toHaveBeenCalledTimes(1);
    expect(mockedRotatePassword).toHaveBeenCalledTimes(1);
    expect(mockedRotateApiKey).toHaveBeenCalledTimes(0);
    expect(mockedHandleError).toHaveBeenCalledTimes(1);
    expect(mockedHandleError).toHaveBeenCalledWith(expectedError);
  });

  test('GIVEN context WHEN rotate api key fails THEN handle error', async () => {
    mockedNewKeyVaultClient.mockReturnValue(mockedKeyVaultClient);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, password, passwordThreshold)
      .mockResolvedValue(true);
    when(mockedsecretExpired)
      .calledWith(mockedKeyVaultClient, apiKey, apiKeyThreshold)
      .mockResolvedValue(true);
    const expectedError = new RotateSecretsError('wrong');
    mockedRotateApiKey.mockImplementation(() => { throw expectedError; });

    await rotateSecrets(mockedContext);

    expect(newKeyVaultClient).toHaveBeenCalledTimes(1);
    expect(AuthApiClient.newAuthApiClient).toHaveBeenCalledTimes(1);
    expect(mockedsecretExpired).toHaveBeenCalledTimes(2);
    expect(mockedRotatePassword).toHaveBeenCalledTimes(1);
    expect(mockedRotateApiKey).toHaveBeenCalledTimes(1);
    expect(mockedHandleError).toHaveBeenCalledTimes(1);
    expect(mockedHandleError).toHaveBeenCalledWith(expectedError);
  });
});
