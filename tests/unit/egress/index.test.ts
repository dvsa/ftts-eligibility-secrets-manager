import each from 'jest-each';
import { Address, InternalAccessDeniedError } from '@dvsa/egress-filtering';
import { mockedConfig } from '../../mocks/config.mock';
import { mockedLogger } from '../../mocks/logger.mock';
import { ALLOWED_ADDRESSES, ON_INTERNAL_ACCESS_DENIED_ERROR } from '../../../src/egress';
import { BusinessTelemetryEvent } from '../../../src/observability/logger';

jest.mock('../../../src/config');
jest.mock('../../../src/observability/logger');

describe('egress', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ALLOWED_ADDRESSES', () => {
    each([
      [
        (): void => {
          mockedConfig.dvlaApi.authenticationBaseUri = 'http://www.gov.uk';
          mockedConfig.keyVault.uri = 'https://secret.vault.azure.net/';
        },
        [
          {
            host: 'www.gov.uk',
            port: 80,
          },
          {
            host: 'secret.vault.azure.net',
            port: 443,
          },
        ],
      ],
    ]).test('contain all required addresses as per the config', (
      givenConfig: () => void,
      expectedAddresses: Address[],
    ) => {
      givenConfig();
      expect(ALLOWED_ADDRESSES()).toEqual(expectedAddresses);
    });
  });

  describe('ON_INTERNAL_ACCESS_DENIED_ERROR', () => {
    each([
      [
        new InternalAccessDeniedError('localhost', '80', 'Unrecognised address'),
      ],
    ]).test('proper event is logged', (givenError: InternalAccessDeniedError) => {
      ON_INTERNAL_ACCESS_DENIED_ERROR(givenError);

      expect(mockedLogger.logEvent).toHaveBeenCalledWith(
        BusinessTelemetryEvent.NOT_WHITELISTED_URL_CALL,
        givenError.message,
        {
          host: givenError.host,
          port: givenError.port,
        },
      );
    });
  });
});
