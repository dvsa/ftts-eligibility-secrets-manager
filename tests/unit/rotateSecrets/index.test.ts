import { AzureFunction, Context } from '@azure/functions';
import { nonHttpTriggerContextWrapper } from '@dvsa/azure-logger';
import { index } from '../../../src/rotateSecrets';
import { rotateSecrets } from '../../../src/rotateSecrets/rotateSecrets';
import { describeEgressFiltering } from '../../mocks/egressFiltering.describe';

jest.mock('@dvsa/azure-logger');
jest.mock('../../../src/observability/logger');
jest.mock('../../../src/rotateSecrets/rotateSecrets');

const mockedRotateSecrets = jest.mocked(rotateSecrets);

jest.mocked(nonHttpTriggerContextWrapper).mockImplementation(
  async (fn: AzureFunction, context: Context) => fn(context),
);

describe('index', () => {
  describe('egressFiltering', describeEgressFiltering(index, mockedRotateSecrets));
});
