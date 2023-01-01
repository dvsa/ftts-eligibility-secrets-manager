import { generatePassword } from '../../../src/rotateSecrets/generatePassword';

describe('generatePassword', () => {
  test('GIVEN nothing WHEN generatePassword THEN new password fit conditions', () => {
    for (let index = 0; index < 100; index++) {
      const newPassword = generatePassword();

      expect(newPassword.length).toEqual(12);
      expect(newPassword).toMatch(/[0-9]/);
      expect(newPassword).toMatch(/[a-z]/);
      expect(newPassword).toMatch(/[A-Z]/);
      expect(newPassword).toMatch(/[!@#$%^&*()+_\-=}{[\]|:;"/?.><,`~]/);
    }
  });
});
