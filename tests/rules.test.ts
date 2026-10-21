import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc } from "firebase/firestore";
let env: RulesTestEnvironment;
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
beforeAll(async () => {
  if (enabled)
    env = await initializeTestEnvironment({
      projectId: "demo-daily",
      firestore: { rules: readFileSync("firestore.rules", "utf8") },
    });
});
afterAll(async () => {
  if (env) await env.cleanup();
});
it.skipIf(!enabled)(
  "項目作成・部分更新を許可し、分類変更と不正なスタンプを拒否",
  async () => {
    const db = env.authenticatedContext("habits-user").firestore();
    const h = doc(db, "users/habits-user/habits/water");
    await assertSucceeds(
      setDoc(h, {
        id: "water",
        name: "水2L",
        kind: "habit",
        active: true,
        deleted: false,
        created: "2026-10-21",
      }),
    );
    await assertSucceeds(setDoc(h, { name: "水1.5L" }, { merge: true }));
    await assertFails(setDoc(h, { kind: "medication" }, { merge: true }));
    const r = doc(db, "users/habits-user/dailyRecords/2026-10-21");
    await assertSucceeds(
      setDoc(r, { date: "2026-10-21", meals: { breakfast: "朝食" } }),
    );
    await assertSucceeds(
      setDoc(r, { habits: { water: null } }, { merge: true }),
    );
    await assertFails(setDoc(r, { habits: { water: "yes" } }, { merge: true }));
    await assertFails(
      setDoc(r, { meals: { breakfast: "a".repeat(2001) } }, { merge: true }),
    );
  },
);
it.skipIf(!enabled)("本人の読み書きだけ許可し、不正値を拒否", async () => {
  const own = env.authenticatedContext("alice").firestore(),
    other = env.authenticatedContext("bob").firestore(),
    anon = env.unauthenticatedContext().firestore();
  await assertSucceeds(
    setDoc(doc(own, "users/alice/dailyRecords/2026-10-21"), {
      date: "2026-10-21",
      weight: 80,
    }),
  );
  await assertFails(getDoc(doc(other, "users/alice/dailyRecords/2026-10-21")));
  await assertFails(getDoc(doc(anon, "users/alice/dailyRecords/2026-10-21")));
  await assertFails(
    setDoc(doc(own, "users/alice/dailyRecords/2026-10-21"), {
      date: "2026-10-21",
      weight: -1,
    }),
  );
  await assertFails(
    setDoc(doc(own, "users/alice/profile/settings"), {
      target: 70,
      admin: true,
    }),
  );
  expect(true).toBe(true);
});
