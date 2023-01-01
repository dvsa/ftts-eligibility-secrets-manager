/*

IMPORTANT!

To be able to use this in your test file, remember to add:

jest.mock('@dvsa/ftts-role-validation');

*/
/* eslint-disable @typescript-eslint/no-explicit-any */
import { AzureFunction, Context, HttpRequest } from '@azure/functions';
import { Role, withRolesValidation } from '@dvsa/ftts-role-validation';
import { mockedContext } from './context.mock';

jest.mocked(withRolesValidation).mockImplementation(
  (fn: AzureFunction) => (context: Context): Promise<any> | void => fn(context),
);

export const describeWithRolesValidation = (fn: AzureFunction, expectedAllowedRoles: Role[]): jest.EmptyFunction => (): void => {
  test('WHEN called THEN the call is then wrapped into withRolesValidation', async () => {
    await fn(mockedContext, {} as HttpRequest);

    expect(withRolesValidation).toHaveBeenCalledTimes(1);
    expect(withRolesValidation).toHaveBeenCalledWith(
      expect.any(Function),
      true,
      expectedAllowedRoles,
      expect.any(Function),
    );
  });
};
