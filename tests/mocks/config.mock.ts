/*

IMPORTANT!

To be able to use this mock in your test file, remember to add:

jest.mock('PATH/src/config')

*/
import config from '../../src/config';

export const mockedConfig = jest.mocked(config, true);
