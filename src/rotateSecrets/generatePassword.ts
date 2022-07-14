import * as passwordGenerator from 'generate-password';

export const generatePassword = (): string => passwordGenerator.generate({
  length: 12,
  lowercase: true,
  uppercase: true,
  numbers: true,
  symbols: true,
  strict: true,
});
