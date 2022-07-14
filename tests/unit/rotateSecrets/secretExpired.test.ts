import each from 'jest-each';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import MockDate from 'mockdate';
import { KeyVaultClient } from '../../../src/keyVault/keyVaultClient';
import { secretExpired } from '../../../src/rotateSecrets/secretExpired';
import { mockedLogger } from '../../mocks/logger.mock';

jest.mock('../../../src/observability/logger');

jest.mock('../../../src/keyVault/keyVaultClient');
const mockedKeyVaultClient = mock<KeyVaultClient>();

const secretName = 'secret';
const today = '2021-01-01T00:00:00.000Z';

describe('secretExpired', () => {
  beforeEach(() => {
    MockDate.set(today);
    jest.clearAllMocks();
  });

  each([
    [
      new Date('2021-02-01'),
      14,
      false,
      'rotateSecrets: Secret is valid',
    ],
    [
      new Date('2021-01-03'),
      1,
      false,
      'rotateSecrets: Secret is valid',
    ],
    [
      new Date('2021-01-02:23:00'),
      14,
      true,
      'rotateSecrets: Secret expired',
    ],
    [
      new Date('2021-01-02'),
      14,
      true,
      'rotateSecrets: Secret expired',
    ],
    [
      undefined,
      14,
      true,
      'rotateSecrets: No secret expiration date',
    ],
  ]).test('GIVEN a keyVaultClient AND secretName WHEN called THEN returns proper boolean value', async (
    secretExpirationDate: Date,
    threshold: number,
    expectedResult: boolean,
    endLogMessage: string,
  ) => {
    when(mockedKeyVaultClient.getSecretExpirationDate)
      .calledWith(secretName)
      .mockResolvedValue(secretExpirationDate);

    const result = await secretExpired(mockedKeyVaultClient, secretName, threshold);

    expect(result).toEqual(expectedResult);
    expect(mockedKeyVaultClient.getSecretExpirationDate).toHaveBeenCalledTimes(1);
    expect(mockedLogger.info).toHaveBeenCalledTimes(2);
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      1,
      'rotateSecrets: Trying to verify secret expiration date',
      { secretName },
    );
    expect(mockedLogger.info).toHaveBeenNthCalledWith(
      2,
      endLogMessage,
      {
        secretName,
        secretExpirationDate: secretExpirationDate ? secretExpirationDate.toISOString() : undefined,
      },
    );
  });
});
