import http from 'http';
import { AzureFunction } from '@azure/functions';
import { MaybeMocked } from 'ts-jest';
import { mockedContext } from './context.mock';
import { mockedLogger } from './logger.mock';
import { BusinessTelemetryEvent } from '../../src/observability/logger';

export const describeEgressFiltering = (fn: AzureFunction, mockedTimerTrigger: MaybeMocked<AzureFunction>): jest.EmptyFunction => (): void => {
  mockedTimerTrigger.mockImplementation(async () => {
    await new Promise((resolve) => {
      http.get('http://www.google.com', (res) => {
        resolve(res.statusCode);
      });
    });
  });

  test('GIVEN a non-whitelisted url call WHEN made THEN the proper event is logged', async () => {
    await fn(mockedContext);

    expect(mockedLogger.logEvent).toHaveBeenCalledWith(
      BusinessTelemetryEvent.NOT_WHITELISTED_URL_CALL,
      'Unrecognised address - host www.google.com port 80',
      {
        host: 'www.google.com',
        port: 80,
      },
    );
  });
};
