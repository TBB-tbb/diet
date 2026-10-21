import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { auth, db, configured, write } from "./firebase";
import {
  initial,
  blank,
  shift,
  today,
  validate,
  type Data,
  type Daily,
} from "./model";
export function useStore() {
  const [user, setUser] = useState<User | null>(null),
    [ready, setReady] = useState(!configured),
    [local, setLocal] = useState(false),
    [data, setData] = useState<Data>(initial),
    [status, setStatus] = useState(""),
    [error, setError] = useState(""),
    [from, setFrom] = useState(shift(today(), -36));
  const ref = useRef(data);
  ref.current = data;
  const uid = useRef<string | null>(null);
  const retries = useRef<Array<() => Promise<void>>>([]);
  useEffect(
    () =>
      auth
        ? onAuthStateChanged(auth, (u) => {
            uid.current = u?.uid ?? null;
            setUser(u);
            setData(initial());
            setReady(!u);
            setLocal(false);
          })
        : undefined,
    [],
  );
  useEffect(() => {
    if (!local) return;
    try {
      const raw = localStorage.getItem("daily-local");
      if (raw) setData(validate(JSON.parse(raw)));
    } catch {
      setError("ローカルデータを読み込めませんでした");
    }
  }, [local]);
  useEffect(() => {
    if (!user || !db) return;
    let cancelled = false;
    setReady(false);
    const unsubs: Array<() => void> = [];
    (async () => {
      const settings = await getDoc(
        doc(db, "users", user.uid, "profile", "settings"),
      );
      if (!settings.exists()) {
        const seed = initial();
        await Promise.all([
          write(user.uid, "profile/settings", { target: null }),
          ...seed.habits.map((h) => write(user.uid, `habits/${h.id}`, h)),
        ]);
      }
      if (cancelled) return;
      unsubs.push(
        onSnapshot(
          doc(db, "users", user.uid, "profile", "settings"),
          (s) => setData((d) => ({ ...d, target: s.data()?.target ?? null })),
          (e) => setError(e.message),
        ),
      );
      unsubs.push(
        onSnapshot(
          collection(db, "users", user.uid, "habits"),
          (s) => {
            setData((d) => ({
              ...d,
              habits: s.docs.map((x) => x.data() as Data["habits"][number]),
            }));
            setReady(true);
          },
          (e) => setError(e.message),
        ),
      );
    })().catch((e) => {
      setError(e.message);
      setReady(true);
    });
    return () => {
      cancelled = true;
      unsubs.forEach((f) => f());
    };
  }, [user]);
  useEffect(() => {
    if (!user || !db) return;
    return onSnapshot(
      query(
        collection(db, "users", user.uid, "dailyRecords"),
        where("date", ">=", from),
        orderBy("date"),
      ),
      { includeMetadataChanges: true },
      (s) => {
        setData((d) => ({
          ...d,
          records: {
            ...d.records,
            ...Object.fromEntries(
              s.docs.map((x) => [
                x.id,
                { ...blank(x.id), ...x.data() } as Daily,
              ]),
            ),
          },
        }));
        setStatus(
          s.metadata.hasPendingWrites
            ? "同期待ち"
            : s.metadata.fromCache
              ? "キャッシュ表示"
              : "保存済み",
        );
      },
      (e) => setError(e.message),
    );
  }, [user, from]);
  function commit(next: Data, remote: () => Promise<void>) {
    setData(next);
    ref.current = next;
    if (local) {
      try {
        localStorage.setItem("daily-local", JSON.stringify(next));
        setStatus("この端末に保存済み");
      } catch {
        setError("端末に保存できません。空き容量を確認してください");
      }
      return;
    }
    if (!uid.current) return;
    setStatus(navigator.onLine ? "保存中…" : "オフライン・同期待ち");
    remote()
      .then(() => setStatus("保存済み"))
      .catch((e) => {
        retries.current.push(remote);
        setStatus("保存失敗");
        setError(e.message);
      });
  }
  function record(date: string, patch: Partial<Daily>) {
    const current = ref.current;
    const r = { ...blank(date), ...current.records[date] };
    const next = {
      ...r,
      ...patch,
      meals: { ...r.meals, ...patch.meals },
      habits: { ...r.habits, ...patch.habits },
      labels: { ...r.labels, ...patch.labels },
    };
    const owner = uid.current!;
    commit({ ...current, records: { ...current.records, [date]: next } }, () =>
      write(owner, `dailyRecords/${date}`, { date, ...patch }),
    );
  }
  function settings(patch: Partial<Pick<Data, "target" | "habits">>) {
    const current = ref.current,
      owner = uid.current!;
    commit({ ...current, ...patch }, async () => {
      if ("target" in patch)
        await write(owner, "profile/settings", { target: patch.target });
      if (patch.habits)
        await Promise.all(
          patch.habits.map((h, i) =>
            write(owner, `habits/${h.id}`, { ...h, order: i }),
          ),
        );
    });
  }
  async function all() {
    if (!user || !db) return ref.current;
    const s = await getDocs(collection(db, "users", user.uid, "dailyRecords"));
    const next = {
      ...ref.current,
      records: {
        ...ref.current.records,
        ...Object.fromEntries(
          s.docs.map((x) => [x.id, { ...blank(x.id), ...x.data() } as Daily]),
        ),
      },
    };
    setData(next);
    ref.current = next;
    return next;
  }
  async function restore(d: Data) {
    const current = await all();
    const records = { ...current.records, ...d.records };
    const habits = [
      ...d.habits,
      ...current.habits.filter((h) => !d.habits.some((x) => x.id === h.id)),
    ];
    const owner = uid.current!;
    commit({ ...d, records, habits }, async () => {
      await write(owner, "profile/settings", { target: d.target });
      for (const h of habits) await write(owner, `habits/${h.id}`, h);
      for (const r of Object.values(d.records))
        await write(owner, `dailyRecords/${r.date}`, r);
    });
  }
  async function retry() {
    const jobs = retries.current.splice(0);
    setError("");
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await job();
        } catch (e) {
          retries.current.push(job);
          setError(String(e));
        }
      }),
    );
    setStatus(retries.current.length ? "保存失敗" : "保存済み");
  }
  const load = useCallback((date: string) => setFrom((f) => date < f ? date : f), []);
  return {
    data,
    user,
    ready,
    local,
    setLocal,
    status,
    error,
    setError,
    record,
    settings,
    all,
    restore,
    retry,
    load,
  };
}
