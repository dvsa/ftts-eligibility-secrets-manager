import handleError from '../../../src/error/handleError';
import { RotateSecretsError } from '../../../src/rotateSecrets/rotateSecretsError';
import { KeyVaultError } from '../../../src/keyVault/keyVaultError';
import { logger, BusinessTelemetryEvent } from '../../../src/observability/logger';

const logEvent = jest.spyOn(logger, 'logEvent');

describe('handleError', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GIVEN an error WHEN called THEN the error is handled', () => {
    const expectedError = new RotateSecretsError(
      'ApiKey rotation failed',
      new KeyVaultError(
        'KeyVault failed',
        new Error('The root cause'),
        {
          keyName: 'keyName',
        },
      ),
      {
        apiKey: 'apiKey',
      },
    );
    try {
      handleError(expectedError);
      fail();
    } catch (error) {
      expect(error).toEqual(expectedError);
      expect(logEvent).toHaveBeenCalledTimes(1);
      expect(logEvent).toHaveBeenCalledWith(
        BusinessTelemetryEvent.ELI_SEC_DVLA_SECRET_ROTATION_FAILED,
        'ApiKey rotation failed',
        {
          errorName: 'RotateSecretsError',
          apiKey: 'apiKey',
          cause: {
            message: 'KeyVault failed',
            properties: {
              errorName: 'KeyVaultError',
              keyName: 'keyName',
              cause: {
                message: 'The root cause',
                properties: {
                  errorName: 'Error',
                },
              },
            },
          },
        },
      );
    }
  });
});
