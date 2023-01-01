/*

IMPORTANT!

To be able to use this mock in your test file, remember to add:

jest.mock('PATH/src/observability/logger')

*/
import { logger } from '../../src/observability/logger';

export const mockedLogger = jest.mocked(logger, true);
