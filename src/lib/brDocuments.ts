export const onlyDocumentDigits = (value: string) => value.replace(/\D/g, "");

export function isValidCpf(value: string): boolean {
  const digits = onlyDocumentDigits(value);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (base: string, factor: number) => {
    let sum = 0;
    for (const char of base) {
      sum += Number(char) * factor--;
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  const first = calculateDigit(digits.slice(0, 9), 10);
  if (first !== Number(digits[9])) return false;

  const second = calculateDigit(digits.slice(0, 10), 11);
  return second === Number(digits[10]);
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDocumentDigits(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;

  const digitFor = (base: string, weights: number[]) => {
    const sum = base
      .split("")
      .reduce((total, char, index) => total + Number(char) * weights[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const first = digitFor(digits.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  if (first !== Number(digits[12])) return false;

  const second = digitFor(digits.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return second === Number(digits[13]);
}
