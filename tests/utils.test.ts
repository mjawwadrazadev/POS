import { describe, it, expect } from "vitest";
import { escapeHtml, generateDocNumber, isValidPin, roundMoney } from "@/lib/utils/server";
import { sanitizeProductInput } from "@/lib/inventory/productInput";

describe("escapeHtml", () => {
  it("neutralises markup and quotes", () => {
    expect(escapeHtml(`<script>alert("x")</script>&'`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&amp;&#39;"
    );
  });

  it("handles null/undefined", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});

describe("generateDocNumber", () => {
  it("uses the prefix, a date part and a random suffix", () => {
    expect(generateDocNumber("ORD")).toMatch(/^ORD-\d{6}-[0-9A-F]{6}$/);
  });

  it("does not collide across many calls", () => {
    const numbers = new Set(Array.from({ length: 2000 }, () => generateDocNumber("ORD")));
    expect(numbers.size).toBe(2000);
  });
});

describe("isValidPin", () => {
  it("accepts exactly four digits", () => {
    expect(isValidPin("0420")).toBe(true);
    expect(isValidPin("123")).toBe(false);
    expect(isValidPin("12345")).toBe(false);
    expect(isValidPin("12a4")).toBe(false);
    expect(isValidPin(1234)).toBe(false);
  });
});

describe("roundMoney", () => {
  it("rounds to two decimals", () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(10.005)).toBeCloseTo(10.01, 2);
  });
});

describe("sanitizeProductInput", () => {
  it("drops fields that are not whitelisted (e.g. organizationId, stock)", () => {
    const { data, error } = sanitizeProductInput(
      { name: "Cake", sku: "bak-1", price: 100, organizationId: "evil", stock: 999, _id: "x" },
      { partial: false }
    );
    expect(error).toBeUndefined();
    expect(data).toEqual({ name: "Cake", sku: "BAK-1", price: 100 });
  });

  it("requires name, sku and a positive price on create", () => {
    expect(sanitizeProductInput({ sku: "A", price: 1 }, { partial: false }).error).toBeTruthy();
    expect(sanitizeProductInput({ name: "A", price: 1 }, { partial: false }).error).toBeTruthy();
    expect(sanitizeProductInput({ name: "A", sku: "A", price: 0 }, { partial: false }).error).toBeTruthy();
  });

  it("rejects negative numbers", () => {
    expect(sanitizeProductInput({ costPrice: -5 }, { partial: true }).error).toBeTruthy();
  });
});
