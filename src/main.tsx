import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { registerSW } from "virtual:pwa-register";
import {
  APP_NAME,
  average,
  blank,
  initial,
  shift,
  today,
  validate,
  type Data,
  type Daily,
  type Habit,
} from "./model";
import { configured, login, logout } from "./firebase";
import { useStore } from "./useStore";
import "./style.css";
const updateSW = registerSW({
  onNeedRefresh() {
    if (confirm("新しいバージョンがあります。更新しますか？"))
      void updateSW(true);
  },
});
const meals = [
  ["breakfast", "朝食", "☀"],
  ["lunch", "昼食", "◒"],
  ["dinner", "夕食", "☾"],
  ["snack", "間食・夜食", "◇"],
];
const pretty = (n: number | null | undefined) =>
  n == null ? "—" : n.toFixed(1);
function Field({
  value,
  onSave,
  numeric = false,
  label,
  placeholder,
}: {
  value: string;
  onSave: (s: string) => void;
  numeric?: boolean;
  label: string;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (draft === value) return;
    const t = setTimeout(() => onSave(draft), 900);
    return () => clearTimeout(t);
  }, [draft, value, onSave]);
  return numeric ? (
    <input
      aria-label={label}
      inputMode="decimal"
      placeholder={placeholder ?? "—"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onSave(draft);
      }}
    />
  ) : (
    <textarea
      aria-label={label}
      maxLength={2000}
      rows={2}
      placeholder={placeholder ?? "食べたものを、ひとこと。"}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onSave(draft);
      }}
    />
  );
}
function Chart({
  data,
  history = false,
  load,
}: {
  data: Data;
  history?: boolean;
  load: (d: string) => void;
}) {
  const [days, setDays] = useState(30),
    [mode, setMode] = useState("avg");
  const earliest = Object.keys(data.records).sort()[0] ?? today();
  const count =
    days ||
    Math.max(
      30,
      Math.round((Date.parse(today()) - Date.parse(earliest)) / 86400000) + 1,
    );
  useEffect(() => load(shift(today(), -(count + 6))), [count, load]);
  const points = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const date = shift(today(), i - count + 1);
        return {
          date,
          raw: data.records[date]?.weight ?? null,
          avg: average(data.records, date),
        };
      }),
    [count, data.records],
  );
  const values = points
    .flatMap((p) => [p.raw, p.avg])
    .filter((v): v is number => v !== null);
  const min = values.length ? Math.floor(Math.min(...values) - 1) : 50,
    max = values.length ? Math.ceil(Math.max(...values) + 1) : 80;
  return (
    <section className="card chart">
      <div className="section-top">
        <div>
          <span className="eyebrow">YOUR PROGRESS</span>
          <h2>体重の推移</h2>
        </div>
        <div className="seg">
          {(history ? [30, 90, 180, 0] : [7, 30, 90]).map((n) => (
            <button
              key={n}
              className={days === n ? "selected" : ""}
              onClick={() => {
                if (n === 0) load("0001-01-01");
                setDays(n);
              }}
            >
              {n ? `${n}日` : "全期間"}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-mode">
        <button
          className={mode === "avg" ? "active" : ""}
          onClick={() => setMode("avg")}
        >
          ● 7日移動平均
        </button>
        <button
          className={mode === "raw" ? "active" : ""}
          onClick={() => setMode("raw")}
        >
          ● 実測値
        </button>
      </div>
      <div className="plot">
        {values.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={points}
              margin={{ top: 15, right: 12, left: -24, bottom: 0 }}
            >
              <CartesianGrid
                vertical={false}
                stroke="#303a31"
                strokeDasharray="3 5"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(d) => d.slice(5).replace("-", "/")}
                minTickGap={40}
                tick={{ fill: "#929d95", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[min, max]}
                tick={{ fill: "#929d95", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#202922",
                  border: "1px solid #435044",
                  borderRadius: 12,
                }}
                labelFormatter={(l) => String(l)}
                formatter={(v) => [
                  typeof v === "number" ? `${v.toFixed(1)} kg` : "—",
                  mode === "avg" ? "7日平均" : "実測",
                ]}
              />
              {data.target !== null &&
                data.target >= min &&
                data.target <= max && (
                  <ReferenceLine
                    y={data.target}
                    stroke="#8ea681"
                    strokeDasharray="4 4"
                  />
                )}
              <Line
                type="linear"
                dataKey={mode}
                stroke="#b6e3a2"
                strokeWidth={2.5}
                dot={mode === "raw" ? { r: 3 } : false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="empty">
            <span>↗</span>
            <p>小さな記録が、変化の線になる。</p>
            <small>まずは今日の体重からはじめましょう</small>
          </div>
        )}
      </div>
      <p className="note">
        7日平均は直近7暦日のうち、3日以上の測定で表示されます。
      </p>
    </section>
  );
}
function Stamps({
  data,
  end,
  onChange,
  onMove,
}: {
  data: Data;
  end: string;
  onChange: (date: string, patch: Partial<Daily>) => void;
  onMove: (d: string) => void;
}) {
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scroll.current) scroll.current.scrollLeft = scroll.current.scrollWidth;
  }, [end]);
  const days = Array.from({ length: 7 }, (_, i) => shift(end, i - 6));
  const habits = data.habits.filter(
    (h) =>
      (!h.deleted && h.active) ||
      days.some((d) => h.id in (data.records[d]?.habits ?? {})),
  );
  let achieved = 0,
    recorded = 0,
    total = 0,
    med = 0;
  for (const h of habits)
    for (const d of days) {
      if (d > today() || d < h.created) continue;
      const v = data.records[d]?.habits[h.id];
      if (h.kind === "medication") {
        if (v === true || v === false) med++;
      } else {
        total++;
        if (v === true) achieved++;
        if (v === true || v === false) recorded++;
      }
    }
  return (
    <section className="card stamps">
      <div className="section-top">
        <div>
          <span className="eyebrow">ONE DAY AT A TIME</span>
          <h2>習慣のスタンプカード</h2>
        </div>
        <span className="pill">7 DAYS</span>
      </div>
      <div className="week-nav">
        <button aria-label="前の週" onClick={() => onMove(shift(end, -7))}>
          ←
        </button>
        <span>
          {days[0].slice(5).replace("-", "/")} —{" "}
          {end.slice(5).replace("-", "/")}
        </span>
        <button
          aria-label="次の週"
          disabled={end >= today()}
          onClick={() =>
            onMove(shift(end, 7) > today() ? today() : shift(end, 7))
          }
        >
          →
        </button>
        <button className="today-btn" onClick={() => onMove(today())}>
          今日へ
        </button>
      </div>
      <div className="table-scroll" ref={scroll}>
        <table>
          <thead>
            <tr>
              <th>毎日の習慣</th>
              {days.map((d) => (
                <th key={d} className={d === today() ? "today" : ""}>
                  <small>
                    {"日月火水木金土"[new Date(d + "T12:00:00Z").getUTCDay()]}
                  </small>
                  {Number(d.slice(8))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((h) => (
              <tr key={h.id}>
                <th>
                  <span>{h.kind === "medication" ? "✚" : "◇"}</span>
                  {h.name}
                  {h.kind === "medication" && <small>服薬記録</small>}
                </th>
                {days.map((d) => {
                  const r = data.records[d],
                    v = r?.habits[h.id] ?? null,
                    label = r?.labels[h.id] ?? h.name;
                  return (
                    <td key={d} className={d === today() ? "today" : ""}>
                      <button
                        disabled={d > today() || d < h.created}
                        title={`${d} ${label}`}
                        aria-label={`${d} ${label}：${v === null ? "未記録" : v ? "達成" : "未達成"}`}
                        className={`stamp ${v === true ? "done" : v === false ? "miss" : "unset"}`}
                        onClick={() =>
                          onChange(d, {
                            habits: {
                              [h.id]:
                                v === null ? true : v === true ? false : null,
                            },
                            labels: { [h.id]: label },
                          })
                        }
                      >
                        {v === true ? "✓" : v === false ? "−" : "○"}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="stamp-summary">
        <div>
          <strong>
            {achieved}
            <span> / {total}</span>
          </strong>
          <small>
            生活習慣の達成 · 記録済み {recorded}件
            {recorded
              ? ` · 達成率 ${Math.round((achieved / recorded) * 100)}%`
              : ""}
          </small>
        </div>
        <p>
          服薬：{med}件記録済み
          <br />
          <small>生活習慣のスコアには含みません</small>
        </p>
      </div>
      <p className="note">
        ○ 未記録　 ✓ 達成　 − 未達成 · タップで切り替え
        <br />
        過去のセルを長押しすると、記録当時の項目名を確認できます。
      </p>
    </section>
  );
}
function App() {
  const s = useStore(),
    [page, setPage] = useState("home"),
    [date, setDate] = useState(today()),
    [end, setEnd] = useState(today()),
    [month, setMonth] = useState(today().slice(0, 7)),
    [pending, setPending] = useState<Data | null>(null),
    [online, setOnline] = useState(navigator.onLine),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const f = () => setOnline(navigator.onLine);
    window.addEventListener("online", f);
    window.addEventListener("offline", f);
    return () => {
      window.removeEventListener("online", f);
      window.removeEventListener("offline", f);
    };
  }, []);
  const r = s.data.records[date] ?? blank(date),
    weights = Object.values(s.data.records)
      .filter((x) => x.weight !== null)
      .sort((a, b) => a.date.localeCompare(b.date)),
    prev = weights.filter((x) => x.date < date).at(-1)?.weight;
  function weight(v: string) {
    if (!v.trim()) {
      s.record(date, { weight: null });
      return;
    }
    const n = Number(v);
    if (
      !Number.isFinite(n) ||
      n < 20 ||
      n > 400 ||
      Math.abs(n * 10 - Math.round(n * 10)) > 0.00001
    ) {
      s.setError("体重は20〜400kg、小数第1位まで入力してください");
      return;
    }
    s.record(date, { weight: n });
  }
  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      s.setError(String(e));
    } finally {
      setBusy(false);
    }
  };
  const changeEnd = (d: string) => {
    s.load(shift(d, -6));
    setEnd(d);
  };
  if (!s.ready)
    return (
      <div className="loading">
        DAILY<span>記録を準備しています…</span>
      </div>
    );
  if (!s.user && !s.local)
    return (
      <div className="welcome">
        <div className="brand">
          d<span> {APP_NAME}</span>
        </div>
        <span className="eyebrow">SMALL STEPS. EVERY DAY.</span>
        <h1>
          毎日の積み重ねが、
          <br />
          未来のあなたに。
        </h1>
        <p>
          体重、食事、いつもの習慣。
          <br />
          無理なく記録して、自分のペースで続けよう。
        </p>
        <div className="welcome-mark">
          ↗<span>ONE DAY AT A TIME</span>
        </div>
        {configured ? (
          <>
            <button
              className="primary"
              disabled={busy}
              onClick={() => act(login)}
            >
              Googleでログイン
            </button>
            <p className="note">
              この端末にオフライン用の記録を保存します。
              <br />
              共有端末での利用は避けてください。
            </p>
          </>
        ) : (
          <>
            <p className="setup-note">
              Firebase未接続 · まずはこの端末で体験できます
            </p>
            <button className="primary" onClick={() => s.setLocal(true)}>
              ローカルで使ってみる →
            </button>
            <p className="note">
              端末内に保存されます。複数端末の同期にはFirebase設定が必要です。
            </p>
          </>
        )}
        {s.error && <p role="alert">{s.error}</p>}
      </div>
    );
  return (
    <div className="shell">
      <aside>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setPage("home");
          }}
        >
          d
          <span>
            {" "}
            {APP_NAME}
            <small>毎日の積み重ね</small>
          </span>
        </a>
        <nav>
          {[
            ["home", "⌂", "ホーム"],
            ["history", "↗", "履歴・分析"],
            ["settings", "⚙", "設定"],
          ].map(([key, icon, label]) => (
            <button
              key={key}
              onClick={() => {
                setPage(key);
                if (key === "home") setDate(today());
              }}
              className={page === key ? "current" : ""}
            >
              <span>{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="aside-foot">
          <div className="little-leaf">↗</div>
          <p>昨日より、ほんの少し。</p>
          <small>自分のペースで続けよう。</small>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <span className="eyebrow">
              {page === "home"
                ? "MY DAILY ROUTINE"
                : page === "history"
                  ? "LOOK BACK, MOVE FORWARD"
                  : "MAKE IT YOURS"}
            </span>
            <h1>
              {page === "home"
                ? "今日の記録"
                : page === "history"
                  ? "履歴・分析"
                  : "設定"}
            </h1>
          </div>
          <div className="account">
            <span className={`dot ${online ? "" : "offline"}`} />
            <small role="status">
              {!online
                ? "オフライン・同期待ち"
                : s.status || (s.local ? "ローカルモード" : "同期済み")}
            </small>
            <span className="avatar">{s.user?.displayName?.[0] ?? "D"}</span>
          </div>
        </header>
        {s.error && (
          <div className="error" role="alert">
            {s.error}
            <button onClick={() => s.retry()}>再試行</button>
            <button onClick={() => s.setError("")}>閉じる</button>
          </div>
        )}
        {page === "home" && (
          <>
            <div className="intro">
              <span>
                {new Date(today() + "T12:00:00Z").toLocaleDateString("ja-JP", {
                  month: "long",
                  day: "numeric",
                  weekday: "long",
                  timeZone: "UTC",
                })}
              </span>
              <p>今日も、自分のための小さな一歩を。</p>
            </div>
            <Weight date={date} r={r} s={s} prev={prev} weight={weight} />
            <Chart data={s.data} load={s.load} />
            <MealCard date={date} r={r} s={s} />
            <Stamps
              data={s.data}
              end={end}
              onChange={s.record}
              onMove={changeEnd}
            />
          </>
        )}
        {page === "history" && (
          <>
            <Chart data={s.data} history load={s.load} />
            <div className="stats-strip">
              <div>
                <small>最初の記録から</small>
                <strong>
                  {weights.length > 1
                    ? pretty(weights.at(-1)!.weight! - weights[0].weight!)
                    : "—"}{" "}
                  <em>kg</em>
                </strong>
              </div>
              <div>
                <small>目標まで</small>
                <strong>
                  {s.data.target !== null && weights.length
                    ? pretty(weights.at(-1)!.weight! - s.data.target)
                    : "—"}{" "}
                  <em>kg</em>
                </strong>
              </div>
            </div>
            <section className="card">
              <div className="section-top">
                <h2>記録カレンダー</h2>
                <input
                  aria-label="表示する月"
                  type="month"
                  value={month}
                  onChange={(e) => {
                    setMonth(e.target.value);
                    s.load(e.target.value + "-01");
                  }}
                />
              </div>
              <div className="calendar">
                {"日月火水木金土".split("").map((d) => (
                  <small key={d}>{d}</small>
                ))}
                {Array.from(
                  { length: new Date(month + "-01T12:00:00Z").getUTCDay() },
                  (_, i) => (
                    <span key={`empty${i}`} />
                  ),
                )}
                {Array.from(
                  {
                    length: new Date(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5)),
                      0,
                    ).getDate(),
                  },
                  (_, i) => {
                    const d = month + "-" + String(i + 1).padStart(2, "0");
                    return (
                      <button
                        key={d}
                        disabled={d > today()}
                        className={date === d ? "chosen" : ""}
                        onClick={() => setDate(d)}
                      >
                        {i + 1}
                        <small>
                          {s.data.records[d]?.weight ??
                            (s.data.records[d] ? "·" : "")}
                        </small>
                      </button>
                    );
                  },
                )}
              </div>
            </section>
            <h2 className="date-heading">
              {date.replaceAll("-", " / ")} の記録
            </h2>
            <Weight date={date} r={r} s={s} prev={prev} weight={weight} />
            <MealCard date={date} r={r} s={s} />
            <Stamps
              data={s.data}
              end={end}
              onChange={s.record}
              onMove={changeEnd}
            />
          </>
        )}
        {page === "settings" && (
          <>
            <section className="card">
              <span className="eyebrow">PROFILE</span>
              <h2>あなたの目標</h2>
              <label className="target">
                目標体重
                <div>
                  <Field
                    label="目標体重"
                    numeric
                    value={s.data.target?.toString() ?? ""}
                    onSave={(v) => {
                      const n = Number(v);
                      if (
                        v === "" ||
                        (Number.isFinite(n) &&
                          n >= 20 &&
                          n <= 400 &&
                          Number.isInteger(n * 10))
                      )
                        s.settings({ target: v === "" ? null : n });
                      else
                        s.setError(
                          "目標体重は20〜400kg、小数第1位まで入力してください",
                        );
                    }}
                  />
                  <span>kg</span>
                </div>
              </label>
              <p className="note">表示単位：kg · 日付の基準：Asia/Tokyo</p>
              <div className="profile">
                {s.user?.displayName ?? "ローカルユーザー"}
                <small>{s.user?.email ?? "この端末だけに保存されます"}</small>
              </div>
              <button
                onClick={() =>
                  act(async () => {
                    if (s.local) s.setLocal(false);
                    else await logout();
                  })
                }
              >
                ログアウト
              </button>
            </section>
            <section className="card">
              <span className="eyebrow">YOUR HABITS</span>
              <h2>行動チェック項目</h2>
              <p className="note">
                名称を変えても、記録当時の条件は過去のセルに残ります。
              </p>
              {s.data.habits
                .filter((h) => !h.deleted)
                .map((h) => (
                  <div className="habit-editor" key={h.id}>
                    <input
                      aria-label={`${h.name}の名称`}
                      maxLength={80}
                      defaultValue={h.name}
                      onBlur={(e) => {
                        if (e.target.value.trim())
                          s.settings({
                            habits: s.data.habits.map((x) =>
                              x.id === h.id
                                ? { ...x, name: e.target.value.trim() }
                                : x,
                            ),
                          });
                      }}
                    />
                    <small>
                      {h.kind === "medication" ? "服薬" : "生活習慣"}
                    </small>
                    <div className="habit-actions">
                      <button
                        aria-label={`${h.name}を上へ`}
                        onClick={() => {
                          const a = [...s.data.habits],
                            i = a.findIndex((x) => x.id === h.id);
                          if (i > 0) {
                            [a[i - 1], a[i]] = [a[i], a[i - 1]];
                            s.settings({ habits: a });
                          }
                        }}
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`${h.name}を下へ`}
                        onClick={() => {
                          const a = [...s.data.habits],
                            i = a.findIndex((x) => x.id === h.id);
                          if (i < a.length - 1) {
                            [a[i + 1], a[i]] = [a[i], a[i + 1]];
                            s.settings({ habits: a });
                          }
                        }}
                      >
                        ↓
                      </button>
                      <button
                        onClick={() =>
                          s.settings({
                            habits: s.data.habits.map((x) =>
                              x.id === h.id ? { ...x, active: !x.active } : x,
                            ),
                          })
                        }
                      >
                        {h.active ? "無効化" : "有効化"}
                      </button>
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              "項目を削除しますか？過去の記録は保持されます。",
                            )
                          )
                            s.settings({
                              habits: s.data.habits.map((x) =>
                                x.id === h.id
                                  ? { ...x, deleted: true, active: false }
                                  : x,
                              ),
                            });
                        }}
                      >
                        削除
                      </button>
                    </div>
                  </div>
                ))}
              <form
                className="add-habit"
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget,
                    f = new FormData(form),
                    name = String(f.get("name")).trim();
                  if (name && s.data.habits.length < 100) {
                    const h: Habit = {
                      id: crypto.randomUUID(),
                      name,
                      kind: f.get("kind") as Habit["kind"],
                      active: true,
                      deleted: false,
                      created: today(),
                    };
                    s.settings({ habits: [...s.data.habits, h] });
                    form.reset();
                  }
                }}
              >
                <input
                  name="name"
                  aria-label="新しい行動項目"
                  placeholder="新しい習慣を追加"
                  maxLength={80}
                  required
                />
                <select name="kind" aria-label="項目の分類">
                  <option value="habit">生活習慣</option>
                  <option value="medication">服薬</option>
                </select>
                <button type="submit">＋ 追加</button>
              </form>
            </section>
            <section className="card">
              <span className="eyebrow">BACKUP</span>
              <h2>記録を大切に</h2>
              <p>
                バックアップには体重・食事・服薬などの個人の健康情報が含まれます。安全な場所に保管してください。
              </p>
              <div className="backup-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const d = await s.all();
                      const url = URL.createObjectURL(
                        new Blob([JSON.stringify(d, null, 2)], {
                          type: "application/json",
                        }),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `daily-${today()}.json`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    })
                  }
                >
                  ↓ JSONエクスポート
                </button>
                <label className="file-button">
                  ↑ JSONインポート
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file)
                        act(async () => {
                          if (file.size > 20_000_000)
                            throw Error("ファイルは20MB以下にしてください");
                          setPending(validate(JSON.parse(await file.text())));
                        });
                    }}
                  />
                </label>
              </div>
              <p className="note">
                同じ日付はバックアップの内容で更新します。ほかの日付の記録は保持します。
              </p>
            </section>
          </>
        )}
        <footer>
          SMALL STEPS. EVERY DAY. <span>{APP_NAME}</span>
        </footer>
      </main>
      {pending && (
        <div className="modal-backdrop">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="restore-title"
            className="card modal"
          >
            <h2 id="restore-title">バックアップを復元</h2>
            <p>
              {Object.keys(pending.records).length}日分・{pending.habits.length}
              項目を読み込みます。同じ日付の記録は上書きされます。
            </p>
            <button
              disabled={busy}
              className="primary"
              onClick={() =>
                act(async () => {
                  await s.restore(pending);
                  setPending(null);
                })
              }
            >
              復元する
            </button>
            <button onClick={() => setPending(null)}>キャンセル</button>
          </section>
        </div>
      )}
    </div>
  );
}
function Weight({
  date,
  r,
  s,
  prev,
  weight,
}: {
  date: string;
  r: Daily;
  s: ReturnType<typeof useStore>;
  prev: number | null | undefined;
  weight: (v: string) => void;
}) {
  return (
    <section className="card weight">
      <div>
        <span className="eyebrow">
          {date === today() ? "TODAY’S WEIGHT" : date}
        </span>
        <h2>{date === today() ? "今日の体重" : "この日の体重"}</h2>
        <div className="weight-input">
          <Field
            label="体重 kg"
            numeric
            value={r.weight?.toString() ?? ""}
            onSave={weight}
          />
          <span>kg</span>
        </div>
        <span className="difference">
          {r.weight !== null && prev != null
            ? `${r.weight - prev > 0 ? "+" : ""}${(r.weight - prev).toFixed(1)} kg 前回比`
            : "測れたときに、記録しよう。"}
        </span>
      </div>
      <div className="weight-side">
        <div>
          <small>直近7日間の平均</small>
          <strong>
            {pretty(average(s.data.records, date))}
            <span> kg</span>
          </strong>
        </div>
        <div>
          <small>目標体重</small>
          <strong>
            {pretty(s.data.target)}
            <span> kg</span>
          </strong>
        </div>
      </div>
    </section>
  );
}
function MealCard({
  date,
  r,
  s,
}: {
  date: string;
  r: Daily;
  s: ReturnType<typeof useStore>;
}) {
  return (
    <section className="card meals">
      <div className="section-top">
        <div>
          <span className="eyebrow">FOOD JOURNAL</span>
          <h2>{date === today() ? "今日の食事" : "この日の食事"}</h2>
        </div>
        <span className="subtle">自動保存</span>
      </div>
      <div className="meal-grid">
        {meals.map(([key, label, icon]) => (
          <label key={key}>
            <span className="meal-label">
              <i>{icon}</i>
              {label}
            </span>
            <Field
              label={label}
              value={r.meals[key] ?? ""}
              onSave={(v) => s.record(date, { meals: { [key]: v } })}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
