export const APP_NAME = "DAILY";
export type Habit = {
  id: string;
  name: string;
  kind: "habit" | "medication";
  active: boolean;
  deleted: boolean;
  created: string;
};
export type Daily = {
  date: string;
  weight: number | null;
  meals: Record<string, string>;
  habits: Record<string, boolean | null>;
  labels: Record<string, string>;
};
export type Data = {
  version: 1;
  target: number | null;
  habits: Habit[];
  records: Record<string, Daily>;
};
export const today = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(
    new Date(),
  );
export function shift(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const blank = (date: string): Daily => ({
  date,
  weight: null,
  meals: { breakfast: "", lunch: "", dinner: "", snack: "" },
  habits: {},
  labels: {},
});
export function initial(): Data {
  return {
    version: 1,
    target: null,
    habits: [
      ["squat", "スクワット10回"],
      ["protein", "プロテインを飲む"],
      ["water", "水を2L飲む"],
      ["rybelsus", "リベルサスを飲んだ"],
    ].map(([id, name]) => ({
      id,
      name,
      kind: id === "rybelsus" ? "medication" : "habit",
      active: true,
      deleted: false,
      created: "1970-01-01",
    })),
    records: {},
  };
}
export function average(records: Data["records"], end: string) {
  const values = Array.from(
    { length: 7 },
    (_, i) => records[shift(end, -i)]?.weight,
  ).filter((x): x is number => typeof x === "number");
  return values.length >= 3
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null;
}
export function validate(value: unknown): Data {
  const d = value as Data;
  if (
    !d ||
    d.version !== 1 ||
    !(
      d.target === null ||
      (typeof d.target === "number" && d.target >= 20 && d.target <= 400)
    ) ||
    !Array.isArray(d.habits) ||
    d.habits.length > 100 ||
    !d.records ||
    typeof d.records !== "object" ||
    Array.isArray(d.records)
  )
    throw Error("バックアップの形式が正しくありません");
  const ids = new Set<string>();
  for (const h of d.habits) {
    if (
      !h ||
      !/^[-\w]{1,80}$/.test(h.id) ||
      ids.has(h.id) ||
      typeof h.name !== "string" ||
      !h.name.trim() ||
      h.name.length > 80 ||
      !["habit", "medication"].includes(h.kind) ||
      typeof h.active !== "boolean" ||
      typeof h.deleted !== "boolean" ||
      !validDate(h.created)
    )
      throw Error("行動項目が不正です");
    ids.add(h.id);
  }
  if (Object.keys(d.records).length > 40000)
    throw Error("記録件数が多すぎます");
  for (const [key, r] of Object.entries(d.records)) {
    if (
      !validDate(key) ||
      r.date !== key ||
      !(
        r.weight === null ||
        (typeof r.weight === "number" &&
          Number.isFinite(r.weight) &&
          r.weight >= 20 &&
          r.weight <= 400)
      ) ||
      !r.meals ||
      !r.habits ||
      !r.labels
    )
      throw Error("日付または体重が不正です");
    for (const meal of ["breakfast", "lunch", "dinner", "snack"])
      if (typeof r.meals[meal] !== "string" || r.meals[meal].length > 2000)
        throw Error("食事記録が不正です");
    for (const [id, v] of Object.entries(r.habits))
      if (!ids.has(id) || ![true, false, null].includes(v))
        throw Error("スタンプが不正です");
    for (const [id, label] of Object.entries(r.labels))
      if (!ids.has(id) || typeof label !== "string" || label.length > 80)
        throw Error("項目名が不正です");
  }
  return d;
}
export function validDate(s: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !Number.isNaN(Date.parse(s + "T12:00:00Z")) &&
    new Date(s + "T12:00:00Z").toISOString().slice(0, 10) === s
  );
}
