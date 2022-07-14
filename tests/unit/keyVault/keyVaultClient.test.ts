import each from 'jest-each';
import { mock } from 'jest-mock-extended';
import { when } from 'jest-when';
import { SecretClient, KeyVaultSecret } from '@azure/keyvault-secrets';
import { KeyVaultClient } from '../../../src/keyVault/keyVaultClient';
import { KeyVaultError } from '../../../src/keyVault/keyVaultError';

jest.mock('@azure/keyvault-secrets');

const mockedSecretClient = mock<SecretClient>();

describe('KeyVaultClient', () => {
  let keyVaultClient: KeyVaultClient;

  const secretKey = 'SECRET_KEY';

  beforeEach(() => {
    keyVaultClient = new KeyVaultClient(
      mockedSecretClient,
    );
    jest.clearAllMocks();
  });

  describe('getSecretValue', () => {
    each([
      [
        secretKey,
        'value',
      ],
    ]).test('GIVEN a secret key WHEN called THEN the secret value is returned', async (
      secretName: string,
      secretValue: string,
    ) => {
      when(mockedSecretClient.getSecret)
        .calledWith(secretName)
        .mockResolvedValue({
          value: secretValue,
        } as KeyVaultSecret);
      expect(
        await keyVaultClient.getSecretValue(secretName),
      ).toEqual(secretValue);
    });

    each([
      [
        secretKey,
        undefined,
      ],
    ]).test('GIVEN no secret value WHEN called THEN an error is thrown', async (
      secretName: string,
      secretValue: string,
    ) => {
      when(mockedSecretClient.getSecret)
        .calledWith(secretName)
        .mockResolvedValue({
          value: secretValue,
        } as KeyVaultSecret);
      try {
        await keyVaultClient.getSecretValue(secretName);
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(KeyVaultError);
        expect(error.message).toBe('KeyVaultClient::getSecretValue: Failed to get a secret value');
        expect(error.cause.message).toBe('KeyVaultClient::getSecretValue: keyValueSecret.value is not defined');
        expect(error.properties).toEqual({
          secretName,
        });
      }
    });
  });

  describe('setSecret', () => {
    each([
      [
        secretKey,
        'value',
        'key',
        new Date('2020-02-22'),
      ],
    ]).test('GIVEN a secret key WHEN called THEN the secret value is set', async (
      secretName: string,
      secretValue: string,
      expiresOn: Date,
    ) => {
      when(mockedSecretClient.setSecret)
        .calledWith(secretName, secretValue, { expiresOn })
        .mockResolvedValue({
          value: secretValue,
        } as KeyVaultSecret);
      expect(
        await keyVaultClient.setSecret(secretName, secretValue, expiresOn),
      ).toEqual(secretValue);
    });

    each([
      [
        secretKey,
        'value',
        'key',
        new Date('2020-02-22'),
      ],
    ]).test('GIVEN an error WHEN called THEN the error is re-thrown', async (
      secretName: string,
      secretValue: string,
      expiresOn: Date,
    ) => {
      when(mockedSecretClient.setSecret)
        .calledWith(secretName, secretValue, { expiresOn })
        .mockRejectedValue(new Error('msg'));
      try {
        await keyVaultClient.setSecret(secretName, secretValue, expiresOn);
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(KeyVaultError);
        expect(error.message).toBe('KeyVaultClient::setSecret: Failed to set a secret');
        expect(error.cause.message).toBe('msg');
        expect(error.properties).toEqual({
          secretName,
        });
      }
    });
  });

  describe('getSecretExpirationDate', () => {
    each([
      [
        secretKey,
        new Date('2021-01-01'),
      ],
      [
        secretKey,
        undefined,
      ],
    ]).test('GIVEN a secret key WHEN called THEN the optional secret expiration date is returned', async (
      secretName: string,
      secretExpirationDate: Date,
    ) => {
      when(mockedSecretClient.getSecret)
        .calledWith(secretName)
        .mockResolvedValue({
          properties: {
            expiresOn: secretExpirationDate,
          },
        } as KeyVaultSecret);

      expect(await keyVaultClient.getSecretExpirationDate(secretName)).toEqual(secretExpirationDate);
      expect(mockedSecretClient.getSecret).toHaveBeenCalledTimes(1);
    });

    test('GIVEN a secret key WHEN keyVault failed THEN an error is thrown', async () => {
      const keyVaultError = new Error('Key Vault failed');
      when(mockedSecretClient.getSecret)
        .calledWith(secretKey)
        .mockRejectedValue(keyVaultError);

      try {
        await keyVaultClient.getSecretExpirationDate(secretKey);
        fail();
      } catch (error) {
        expect(error).toBeInstanceOf(KeyVaultError);
        expect(error.message).toBe('KeyVaultClient::getSecretExpirationDate: Failed to get a secret expiration date');
        expect(error.cause).toEqual(keyVaultError);
        expect(error.properties).toEqual({
          secretName: secretKey,
        });
      }
    });
  });
});
