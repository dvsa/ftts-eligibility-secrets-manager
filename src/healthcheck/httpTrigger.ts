import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { AuthApiClient } from '@dvsa/ftts-dvla-api-model';
import * as Healthcheck from '@dvsa/healthcheck';
import config from '../config';
import { newKeyVaultClient } from '../keyVault/newKeyVaultClient';
import { BusinessTelemetryEvent, logger } from '../observability/logger';

const headers = {
  'Content-Type': 'application/json',
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const httpTrigger: AzureFunction = async function healthcheck(context: Context, _req: HttpRequest): Promise<void> {
  try {
    logger.info('Healthcheck::httpTrigger: Trying to invoke healthcheck function');

    const keyVaultError = await Healthcheck.keyVaultHealthcheck(
      config.keyVault.uri,
      config.userAssignedClientId,
      [
        config.keyVault.secretKey.apiKey,
        config.keyVault.secretKey.username,
        config.keyVault.secretKey.password,
      ],
    );
    let dvlaAuthError;
    if (keyVaultError) {
      dvlaAuthError = new Error('Healthcheck::httpTrigger: Not attempting due to key vault error');
    } else {
      const keyVaultClient = newKeyVaultClient();
      dvlaAuthError = await Healthcheck.dvlaAuthApiHealthcheck(
        AuthApiClient.newAuthApiClient(
          config.dvlaApi.authenticationBaseUri,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (message: string, properties?: Record<string, any>) => {
            logger.info(message, properties);
          },
        ),
        await keyVaultClient.getSecretValue(config.keyVault.secretKey.username),
        await keyVaultClient.getSecretValue(config.keyVault.secretKey.password),
      );
    }

    const errors: Healthcheck.ServiceUnavailableError[] = [];
    if (keyVaultError) {
      errors.push({
        component: Healthcheck.Component.KEY_VAULT,
        message: keyVaultError.message,
      });
    }
    if (dvlaAuthError) {
      errors.push({
        component: Healthcheck.Component.DVLA_AUTH_API,
        message: dvlaAuthError.message,
      });
    }
    if (errors.length > 0) {
      logger.logEvent(
        BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
        'At least one component is unhealthy',
        { errors },
      );
      context.res = {
        status: 503,
        headers,
        body: new Healthcheck.ServiceUnavailableResponse(errors),
      };
    } else {
      logger.logEvent(
        BusinessTelemetryEvent.HEALTH_CHECK_SUCCESS,
        'Components are healthy',
        {
          components: [
            Healthcheck.Component.KEY_VAULT,
            Healthcheck.Component.DVLA_AUTH_API,
          ],
        },
      );
      context.res = {
        status: 200,
      };
    }
  } catch (error) {
    const errorMessage = `Healthcheck::httpTrigger: ${(error as Error)?.message || 'No additional error details'}`;
    logger.error(new Healthcheck.HealthcheckError(errorMessage, error), errorMessage);
    logger.logEvent(
      BusinessTelemetryEvent.HEALTH_CHECK_FAILED,
      errorMessage,
    );
    context.res = {
      status: 500,
      headers,
      body: {
        code: 500,
        message: errorMessage,
      },
    };
  }
};
