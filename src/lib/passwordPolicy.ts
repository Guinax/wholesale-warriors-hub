export const STRONG_PASSWORD_MESSAGE =
  "Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.";

export const isStrongPassword = (value: string) =>
  value.length >= 8 &&
  /[a-z]/.test(value) &&
  /[A-Z]/.test(value) &&
  /\d/.test(value) &&
  /[^A-Za-z0-9]/.test(value);
