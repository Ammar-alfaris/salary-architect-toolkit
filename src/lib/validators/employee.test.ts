import { describe, it, expect } from "vitest";
import { validateEmployeeForm } from "./employee";

const base = {
  first_name: "Ada",
  last_name: "Lovelace",
  base_salary: 10000,
  target_bonus_percent: 10,
};

describe("validateEmployeeForm", () => {
  it("accepts valid minimal input", () => {
    const r = validateEmployeeForm(base);
    expect(r.ok).toBe(true);
  });
  it("rejects missing first_name", () => {
    const r = validateEmployeeForm({ ...base, first_name: "" });
    expect(r.ok).toBe(false);
  });
  it("rejects negative salary", () => {
    const r = validateEmployeeForm({ ...base, base_salary: -1 });
    expect(r.ok).toBe(false);
  });
  it("rejects future hire_date", () => {
    const r = validateEmployeeForm({ ...base, hire_date: "3000-01-01" });
    expect(r.ok).toBe(false);
  });
  it("rejects contract end before start", () => {
    const r = validateEmployeeForm({
      ...base,
      contract_start_date: "2025-06-01",
      contract_end_date: "2025-01-01",
    });
    expect(r.ok).toBe(false);
  });
  it("rejects invalid email", () => {
    const r = validateEmployeeForm({ ...base, email: "not-an-email" });
    expect(r.ok).toBe(false);
  });
});
