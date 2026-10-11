export const STRONG_PASSWORD_MESSAGE =
  "Use pelo menos 10 caracteres, com maiúscula, minúscula, número e símbolo, e evite senhas comuns.";

const COMMON_PASSWORDS = new Set([
  "password",
  "password123",
  "senha123",
  "senha123!",
  "12345678",
  "123456789",
  "qwerty123",
  "admin123",
  "familia123",
]);

export const isStrongPassword = (value: string) => {
  const normalized = value.trim().toLowerCase();
  return (
    value.length >= 10 &&
    /[a-z]/.test(value) &&
    /[A-Z]/.test(value) &&
    /\d/.test(value) &&
    /[^A-Za-z0-9]/.test(value) &&
    !COMMON_PASSWORDS.has(normalized)
  );
};
