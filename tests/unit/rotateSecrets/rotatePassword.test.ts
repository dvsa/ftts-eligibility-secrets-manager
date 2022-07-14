import { AuthApiClient } from '@dvsa/ftts-dvla-api-model';
import { mock } from 'jest-mock-extended';
import { resetAllWhenMocks, when } from 'jest-when';
import MockDate from 'mockdate';
import { KeyVaultClient } from '../../../src/keyVault/keyVaultClient';
import { KeyVaultError } from '../../../src/keyVault/keyVaultError';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { generatePassword } from '../../../src/rotateSecrets/generatePassword';
import { rotatePassword } from '../../../src/rotateSecrets/rotatePassword';
import { RotateSecretsError } from '../../../src/rotateSecrets/rotateSecretsError';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';

jest.mock('../../../src/observability/logger');

jest.mock('../../../src/keyVault/keyVaultClient');
const mockedKeyVaultClient = mock<KeyVaultClient>();

jest.mock('@dvsa/ftts-dvla-api-model');
const mockedAuthApiClient = mock<AuthApiClient>();

jest.mock('../../../src/rotateSecrets/generatePassword');
const mockedGeneratePassword = jest.mocked(generatePassword, true);

const CURRENT_PASSWORD = 'D0&}YY[62AzD';
const USER_NAME = 'ftts';
const NEW_PASSWORD = 'YLQn$vM0>Pt4';
const TODAY = '2021-04-06T12:00:00.000Z';
const EXPIRY_DATE = '2021-04-16T12:00:00.000Z';
const KEY_VAULT_SECRET_KEY_USERNAME = 'key-for-username';
const KEY_VAULT_SECRET_KEY_PASSWORD = 'key-for-password';
const DAYS_TO_EXPIRE = 10;

describe('passwordRotation', () => {
  beforeEach(() => {
    resetAllWhenMocks();
    jest.resetAllMocks();
    mockedConfig.keyVault.secretKey.username = KEY_VAULT_SECRET_KEY_USERNAME;
    mockedConfig.keyVault.secretKey.password = KEY_VAULT_SECRET_KEY_PASSWORD;
    mockedConfig.password.daysToExpire = DAYS_TO_EXPIRE;
    MockDate.set(TODAY);
  });
  test('GIVEN arguments WHEN everything ok THEN password is changed and new secret stored', async () => {
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(KEY_VAULT_SECRET_KEY_USERNAME)
      .mockResolvedValue(USER_NAME);
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(KEY_VAULT_SECRET_KEY_PASSWORD)
      .mockResolvedValue(CURRENT_PASSWORD);
    mockedGeneratePassword.mockReturnValue(NEW_PASSWORD);

    await rotatePassword(mockedKeyVaultClient, mockedAuthApiClient);

    expect(mockedAuthApiClient.changePassword).toHaveBeenCalledTimes(1);
    expect(mockedAuthApiClient.changePassword).toHaveBeenCalledWith({
      userName: USER_NAME,
      password: CURRENT_PASSWORD,
      newPassword: NEW_PASSWORD,
    });
    expect(mockedKeyVaultClient.setSecret).toHaveBeenCalledTimes(1);
    expect(mockedKeyVaultClient.setSecret).toHaveBeenCalledWith(
      KEY_VAULT_SECRET_KEY_PASSWORD,
      NEW_PASSWORD,
      new Date(EXPIRY_DATE),
    );
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith(
      'rotatePassword: Trying to rotate password',
    );
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(BusinessTelemetryEvent.ELI_SEC_DVLA_PASSWORD_ROTATED);
  });

  test('GIVEN arguments WHEN retrieving user name from key vault fails THEN error is thrown', async () => {
    const keyVaultError = new KeyVaultError('cannot get user name');
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(KEY_VAULT_SECRET_KEY_USERNAME)
      .mockImplementation(() => { throw keyVaultError; });

    try {
      await rotatePassword(mockedKeyVaultClient, mockedAuthApiClient);
      fail();
    } catch (actualError) {
      expect(actualError).toBeInstanceOf(RotateSecretsError);
      expect(actualError.message).toBe('rotatePassword: Rotate password failed');
      expect(actualError.cause).toEqual(keyVaultError);
      expect(mockedAuthApiClient.changePassword).toHaveBeenCalledTimes(0);
      expect(mockedKeyVaultClient.setSecret).toHaveBeenCalledTimes(0);
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'rotatePassword: Trying to rotate password',
      );
    }
  });

  test('GIVEN arguments WHEN retrieving password from key vault fails THEN error is thrown', async () => {
    const keyVaultError = new KeyVaultError('cannot get password');
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(KEY_VAULT_SECRET_KEY_PASSWORD)
      .mockImplementation(() => { throw keyVaultError; });

    try {
      await rotatePassword(mockedKeyVaultClient, mockedAuthApiClient);
      fail();
    } catch (actualError) {
      expect(actualError).toBeInstanceOf(RotateSecretsError);
      expect(actualError.message).toBe('rotatePassword: Rotate password failed');
      expect(actualError.cause).toEqual(keyVaultError);
      expect(mockedAuthApiClient.changePassword).toHaveBeenCalledTimes(0);
      expect(mockedKeyVaultClient.setSecret).toHaveBeenCalledTimes(0);
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'rotatePassword: Trying to rotate password',
      );
    }
  });

  test('GIVEN arguments WHEN generating new password fails THEN error is thrown', async () => {
    const generateError = new Error('cannot generate password');
    mockedGeneratePassword.mockImplementation(() => { throw generateError; });

    try {
      await rotatePassword(mockedKeyVaultClient, mockedAuthApiClient);
      fail();
    } catch (actualError) {
      expect(actualError).toBeInstanceOf(RotateSecretsError);
      expect(actualError.message).toBe('rotatePassword: Rotate password failed');
      expect(actualError.cause).toEqual(generateError);
      expect(mockedAuthApiClient.changePassword).toHaveBeenCalledTimes(0);
      expect(mockedKeyVaultClient.setSecret).toHaveBeenCalledTimes(0);
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'rotatePassword: Trying to rotate password',
      );
    }
  });

  test('GIVEN arguments WHEN changing password in DVLA fails THEN error is thrown', async () => {
    const changingPasswordError = new Error('cannot change password');
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(KEY_VAULT_SECRET_KEY_USERNAME)
      .mockResolvedValue(USER_NAME);
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(KEY_VAULT_SECRET_KEY_PASSWORD)
      .mockResolvedValue(CURRENT_PASSWORD);
    mockedGeneratePassword.mockReturnValue(NEW_PASSWORD);
    when(mockedAuthApiClient.changePassword)
      .calledWith({
        userName: USER_NAME,
        password: CURRENT_PASSWORD,
        newPassword: NEW_PASSWORD,
      })
      .mockImplementation(() => { throw changingPasswordError; });

    try {
      await rotatePassword(mockedKeyVaultClient, mockedAuthApiClient);
      fail();
    } catch (actualError) {
      expect(actualError).toBeInstanceOf(RotateSecretsError);
      expect(actualError.message).toEqual('rotatePassword: Rotate password failed');
      expect(actualError.cause).toEqual(changingPasswordError);
      expect(mockedAuthApiClient.changePassword).toHaveBeenCalledTimes(1);
      expect(mockedKeyVaultClient.setSecret).toHaveBeenCalledTimes(0);
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'rotatePassword: Trying to rotate password',
      );
    }
  });

  test('GIVEN arguments WHEN setting new password in key vault fails THEN error is thrown', async () => {
    const storingPasswordError = new Error('cannot change password');
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(KEY_VAULT_SECRET_KEY_USERNAME)
      .mockResolvedValue(USER_NAME);
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(KEY_VAULT_SECRET_KEY_PASSWORD)
      .mockResolvedValue(CURRENT_PASSWORD);
    mockedGeneratePassword.mockReturnValue(NEW_PASSWORD);
    when(mockedKeyVaultClient.setSecret)
      .calledWith(
        KEY_VAULT_SECRET_KEY_PASSWORD,
        NEW_PASSWORD,
        new Date(EXPIRY_DATE),
      )
      .mockImplementation(() => { throw storingPasswordError; });

    try {
      await rotatePassword(mockedKeyVaultClient, mockedAuthApiClient);
      fail();
    } catch (actualError) {
      expect(actualError).toBeInstanceOf(RotateSecretsError);
      expect(actualError.message).toBe('rotatePassword: Rotate password failed');
      expect(actualError.cause).toEqual(storingPasswordError);
      expect(mockedAuthApiClient.changePassword).toHaveBeenCalledTimes(1);
      expect(mockedKeyVaultClient.setSecret).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledTimes(1);
      expect(mockedLogger.info).toHaveBeenCalledWith(
        'rotatePassword: Trying to rotate password',
      );
    }
  });
});
