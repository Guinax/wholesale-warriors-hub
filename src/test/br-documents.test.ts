// @vitest-environment node
import { describe, expect, it } from "vitest";
import { isValidCnpj, isValidCpf, onlyDocumentDigits } from "@/lib/brDocuments";

describe("Brazilian document validation", () => {
  it("normalizes punctuation", () => {
    expect(onlyDocumentDigits("529.982.247-25")).toBe("52998224725");
    expect(onlyDocumentDigits("04.252.011/0001-10")).toBe("04252011000110");
  });

  it("accepts valid CPF and rejects repeated or altered digits", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("000.000.000-00")).toBe(false);
    expect(isValidCpf("529.982.247-24")).toBe(false);
  });

  it("accepts valid CNPJ and rejects repeated or altered digits", () => {
    expect(isValidCnpj("04.252.011/0001-10")).toBe(true);
    expect(isValidCnpj("00.000.000/0000-00")).toBe(false);
    expect(isValidCnpj("04.252.011/0001-11")).toBe(false);
  });
});
