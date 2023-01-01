import { HttpRequest } from '@azure/functions';
import * as Healthcheck from '@dvsa/healthcheck';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { AuthApiClient } from '@dvsa/ftts-dvla-api-model';
import { httpTrigger } from '../../../src/healthcheck/httpTrigger';
import { newKeyVaultClient } from '../../../src/keyVault/newKeyVaultClient';
import { KeyVaultClient } from '../../../src/keyVault/keyVaultClient';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedContext } from '../../mocks/context.mock';
import { mockedLogger } from '../../mocks/logger.mock';

jest.mock('../../../src/config');
jest.mock('../../../src/observability/logger');
jest.mock('@dvsa/healthcheck');
jest.mock('../../../src/keyVault/newKeyVaultClient');
jest.mock('@dvsa/ftts-dvla-api-model');
const mockedKeyVaultHealthcheck = jest.mocked(Healthcheck.keyVaultHealthcheck, true);
const mockedDvlaAuthApiHealthcheck = jest.mocked(Healthcheck.dvlaAuthApiHealthcheck, true);
const mockedNewKeyVaultClient = jest.mocked(newKeyVaultClient, true);
const mockedKeyVaultClient = mock<KeyVaultClient>();

const keyVaultUrl = 'https://kv';
const keyVaultSecretUsername = 'username';
const keyVaultSecretPassword = 'password';
const keyVaultSecretApikey = 'apikey';
const userAssignedClientId = '1234';
const authenticationBaseUri = 'https://dvlaauth';
const username = 'ftts';
const password = 'pumpkin';

describe('healthcheck', () => {
  const httpRequest = mock<HttpRequest>();

  const keyVaultError = new Error('key vault failed');
  const kyeVaultServiceUnavailableError: Healthcheck.ServiceUnavailableError = {
    component: Healthcheck.Component.KEY_VAULT,
    message: 'key vault failed',
  };
  const dvlaAuthError = new Error('dvla auth failed');
  const dvlaAuthServiceUnavailableError: Healthcheck.ServiceUnavailableError = {
    component: Healthcheck.Component.DVLA_AUTH_API,
    message: 'dvla auth failed',
  };
  const dvlaAuthServiceUnavailableDueToKeyVaultError: Healthcheck.ServiceUnavailableError = {
    component: Healthcheck.Component.DVLA_AUTH_API,
    message: 'Healthcheck::httpTrigger: Not attempting due to key vault error',
  };

  beforeEach(() => {
    mockedConfig.keyVault.uri = keyVaultUrl;
    mockedConfig.keyVault.secretKey.username = keyVaultSecretUsername;
    mockedConfig.keyVault.secretKey.password = keyVaultSecretPassword;
    mockedConfig.keyVault.secretKey.apiKey = keyVaultSecretApikey;
    mockedConfig.userAssignedClientId = userAssignedClientId;
    mockedConfig.dvlaApi.authenticationBaseUri = authenticationBaseUri;

    mockedNewKeyVaultClient.mockReturnValue(mockedKeyVaultClient);
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(keyVaultSecretUsername)
      .mockResolvedValue(username);
    when(mockedKeyVaultClient.getSecretValue)
      .calledWith(keyVaultSecretPassword)
      .mockResolvedValue(password);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  test('GIVEN request WHEN no errors THEN return http status 200', async () => {
    mockedKeyVaultHealthcheck.mockResolvedValue(undefined);
    mockedDvlaAuthApiHealthcheck.mockResolvedValue(undefined);

    await httpTrigger(mockedContext, httpRequest);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect((mockedContext.res)!.status).toEqual(200);
    expect(mockedKeyVaultHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedKeyVaultHealthcheck).toHaveBeenCalledWith(
      keyVaultUrl,
      userAssignedClientId,
      [
        keyVaultSecretApikey,
        keyVaultSecretUsername,
        keyVaultSecretPassword,
      ],
    );
    expect(AuthApiClient.newAuthApiClient).toHaveBeenCalledTimes(1);

    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Healthcheck::httpTrigger: Trying to invoke healthcheck function');
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_SUCCESS,
      'Components are healthy',
      {
        components: [
          Healthcheck.Component.KEY_VAULT,
          Healthcheck.Component.DVLA_AUTH_API,
        ],
      },
    );
  });

  test('GIVEN request WHEN key vault error THEN return http status 503 with proper body', async () => {
    mockedKeyVaultHealthcheck.mockResolvedValue(keyVaultError);
    mockedDvlaAuthApiHealthcheck.mockResolvedValue(undefined);

    await httpTrigger(mockedContext, httpRequest);

    expectWhenComponentHasError([kyeVaultServiceUnavailableError, dvlaAuthServiceUnavailableDueToKeyVaultError]);
    expect(mockedKeyVaultHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedDvlaAuthApiHealthcheck).toHaveBeenCalledTimes(0);
  });

  test('GIVEN request WHEN dvla auth error THEN return http status 503 with proper body', async () => {
    mockedKeyVaultHealthcheck.mockResolvedValue(undefined);
    mockedDvlaAuthApiHealthcheck.mockResolvedValue(dvlaAuthError);

    await httpTrigger(mockedContext, httpRequest);

    expectWhenComponentHasError([dvlaAuthServiceUnavailableError]);
    expect(mockedKeyVaultHealthcheck).toHaveBeenCalledTimes(1);
    expect(mockedDvlaAuthApiHealthcheck).toHaveBeenCalledTimes(1);
  });

  test('GIVEN request WHEN error not from tested components THEN returns http status 500 and log proper event', async () => {
    const otherError = new Error();
    mockedKeyVaultHealthcheck.mockRejectedValue(otherError);

    await httpTrigger(mockedContext, httpRequest);

    expect(mockedContext.res).toStrictEqual({
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: {
        code: 500,
        message: 'Healthcheck::httpTrigger: No additional error details',
      },
    });
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Healthcheck::httpTrigger: Trying to invoke healthcheck function');
    expect(mockedLogger.error).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      'Healthcheck::httpTrigger: No additional error details',
    );
  });

  function expectWhenComponentHasError(componentErrors: Healthcheck.ServiceUnavailableError[]): void {
    expect(mockedContext.res).toEqual({
      status: 503,
      headers: {
        'Content-Type': 'application/json',
      },
      body: new Healthcheck.ServiceUnavailableResponse(componentErrors),
    });
    expect(mockedLogger.info).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledWith('Healthcheck::httpTrigger: Trying to invoke healthcheck function');
    expect(mockedLogger.logEvent).toHaveBeenCalledTimes(1);
    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      'At least one component is unhealthy',
      {
        errors: componentErrors,
      },
    );
  }
});
