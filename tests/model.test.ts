import { describe, it, expect } from "vitest";
import { average, blank, initial, shift, validate } from "../src/model";
describe("暦日ベースの移動平均", () => {
  it("3件未満は欠測、欠測を0にしない", () => {
    const d = initial();
    for (const [date, weight] of [
      ["2026-10-15", 100],
      ["2026-10-18", 98],
    ] as const)
      d.records[date] = { ...blank(date), weight };
    expect(average(d.records, "2026-10-21")).toBeNull();
    d.records["2026-10-21"] = { ...blank("2026-10-21"), weight: 96 };
    expect(average(d.records, "2026-10-21")).toBe(98);
    expect(average(d.records, "2026-10-22")).toBeNull();
  });
  it("月と年の境界を扱う", () => {
    expect(shift("2026-01-01", -1)).toBe("2025-12-31");
  });
});
describe("バックアップ検証", () => {
  it("初期データを受け入れる", () =>
    expect(validate(initial()).version).toBe(1));
  it("不正な日付と体重を拒否", () => {
    const d = initial();
    d.records["2026-02-30"] = blank("2026-02-30");
    expect(() => validate(d)).toThrow();
    d.records = { "2026-10-21": { ...blank("2026-10-21"), weight: -1 } };
    expect(() => validate(d)).toThrow();
  });
  it("ID重複を拒否", () => {
    const d = initial();
    d.habits.push(d.habits[0]);
    expect(() => validate(d)).toThrow();
  });
});
