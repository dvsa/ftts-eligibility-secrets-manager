import { HttpRequest } from '@azure/functions';
import { httpTriggerContextWrapper } from '@dvsa/azure-logger';
import { Role } from '@dvsa/ftts-role-validation';
import { index } from '../../../src/healthcheck';
import { mockedContext } from '../../mocks/context.mock';
import { describeWithRolesValidation } from '../../mocks/withRolesValidation.describe';

jest.mock('@dvsa/ftts-role-validation');
jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/egress');

describe('index', () => {
  const mockedRequest = {} as HttpRequest;

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('withRolesValidation', describeWithRolesValidation(index, [Role.OPERATIONS_HEALTHCHECK_READ]));

  describe('GIVEN httpTrigger', () => {
    test('WHEN called THEN the call is first wrapped into httpTriggerContextWrapper', async () => {
      await index(mockedContext, mockedRequest);

      expect(httpTriggerContextWrapper).toHaveBeenCalledTimes(1);
      expect(httpTriggerContextWrapper).toHaveBeenCalledWith(
        expect.any(Function),
        mockedContext,
        mockedRequest,
      );
    });
  });
});
