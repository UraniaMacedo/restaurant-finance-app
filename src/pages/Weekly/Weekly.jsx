import React, { useMemo, useState, useEffect } from "react";
import { listExpensesByDateRange } from "../../firebase/expenses";
import "../../styles/pages.css";
import "./Weekly.css";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { money } from "../../utils/money";
import InsightsCard from "../../components/InsightsCard";
import { buildInsights } from "../../utils/insightEngine";

const CORE_CATEGORIES = [
  "Drinks",
  "Foods",
  "Vegetables",
  "Meat (Chicken)",
  "Meat (Fish)",
  "Suppliers",
  "Payroll",
  "Rent",
  "Utilities",
];

function pad(n) {
  return String(n).padStart(2, "0");
}
function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function startOfWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // move to Monday
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
function addDaysISO(iso, days) {
  const d = new Date(iso + "T00:00:00");
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + Number(days || 0));
  return toISO(d);
}
function safeNum(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}
function pct(part, total) {
  if (!total) return 0;
  return (part / total) * 100;
}

function sumPayment(expenses) {
  const out = { cash: 0, card: 0, bank: 0, cheque: 0, other: 0 };
  for (const e of expenses) {
    const pm = String(e.paymentMethod || "other").toLowerCase();
    const key = out[pm] !== undefined ? pm : "other";
    out[key] += safeNum(e.amount);
  }
  return out;
}

// pega o ISO do expense do jeito mais tolerante possível
function pickExpenseISO(e) {
  const iso = e.date || e.createdAtISO || e.day || e.dayISO || e.expenseDate || null;
  if (!iso) return null;
  return String(iso).slice(0, 10);
}

function groupByDay(expenses, weekStartISO) {
  const dayDefs = [
    { key: "Mon", iso: addDaysISO(weekStartISO, 0) },
    { key: "Tue", iso: addDaysISO(weekStartISO, 1) },
    { key: "Wed", iso: addDaysISO(weekStartISO, 2) },
    { key: "Thu", iso: addDaysISO(weekStartISO, 3) },
    { key: "Fri", iso: addDaysISO(weekStartISO, 4) },
    { key: "Sat", iso: addDaysISO(weekStartISO, 5) },
    { key: "Sun", iso: addDaysISO(weekStartISO, 6) },
  ];

  const out = dayDefs.map((d) => ({ ...d, total: 0, count: 0 }));

  for (const e of expenses) {
    const iso = pickExpenseISO(e);
    if (!iso) continue;

    const idx = dayDefs.findIndex((d) => d.iso === iso);
    if (idx === -1) continue;

    out[idx].total += safeNum(e.amount);
    out[idx].count += 1;
  }

  return out;
}

function BarRow({ label, value, total, currency }) {
  const p = Math.min(100, Math.max(0, pct(value, total)));
  return (
    <div className="wRow">
      <div className="wRowTop">
        <div className="wRowLabel">{label}</div>
        <div className="wRowVal">{money(value, currency)}</div>
      </div>
      <div className="wTrack" aria-hidden="true">
        <div className="wFill" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

function TrendPill({ deltaPct }) {
  const up = deltaPct > 0.5;
  const down = deltaPct < -0.5;
  const tone = up ? "bad" : down ? "good" : "neutral";
  const text = up
    ? `↑ ${Math.abs(deltaPct).toFixed(1)}%`
    : down
    ? `↓ ${Math.abs(deltaPct).toFixed(1)}%`
    : "≈ 0%";
  return <span className={`wPill ${tone}`}>{text}</span>;
}

function formatPM(pm) {
  const p = String(pm || "other").toLowerCase();
  if (p === "cash") return "Cash";
  if (p === "card") return "Card";
  if (p === "bank") return "Bank";
  if (p === "cheque") return "Cheque";
  return "Other";
}

export default function Weekly() {
  const { currency } = usePeriod();
  const restaurantId = "kobi-123";

  const [weekStartISO, setWeekStartISO] = useState(() => {
    const monday = startOfWeekMonday(new Date());
    return toISO(monday);
  });

  const [rows, setRows] = useState([]);
  const [prevRows, setPrevRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // modal do dia
  const [openDay, setOpenDay] = useState(null); // { key, iso } | null

  const weekEndISO = useMemo(() => addDaysISO(weekStartISO, 6), [weekStartISO]);
  const prevStartISO = useMemo(() => addDaysISO(weekStartISO, -7), [weekStartISO]);
  const prevEndISO = useMemo(() => addDaysISO(weekEndISO, -7), [weekEndISO]);

  // ✅ fecha modal com ESC
  useEffect(() => {
    if (!openDay) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpenDay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openDay]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      try {
        const [dataNow, dataPrev] = await Promise.all([
          listExpensesByDateRange(restaurantId, weekStartISO, weekEndISO),
          listExpensesByDateRange(restaurantId, prevStartISO, prevEndISO),
        ]);

        if (!alive) return;
        setRows(Array.isArray(dataNow) ? dataNow : []);
        setPrevRows(Array.isArray(dataPrev) ? dataPrev : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [restaurantId, weekStartISO, weekEndISO, prevStartISO, prevEndISO]);

  const total = useMemo(() => rows.reduce((sum, r) => sum + safeNum(r.amount), 0), [rows]);
  const prevTotal = useMemo(() => prevRows.reduce((sum, r) => sum + safeNum(r.amount), 0), [prevRows]);

  const delta = total - prevTotal;
  const deltaPct = prevTotal ? (delta / prevTotal) * 100 : total ? 100 : 0;

  const count = rows.length;
  const avgDay = total / 7;

  const byPayment = useMemo(() => sumPayment(rows), [rows]);

  const categoryTotals = useMemo(() => {
    const base = {};
    for (const c of CORE_CATEGORIES) base[c] = 0;

    let otherSum = 0;

    for (const r of rows) {
      const cat = String(r.category || "").trim();
      const amt = safeNum(r.amount);
      if (CORE_CATEGORIES.includes(cat)) base[cat] += amt;
      else otherSum += amt;
    }

    const arr = CORE_CATEGORIES.map((c) => [c, base[c]]);
    if (otherSum > 0) arr.push(["Other", otherSum]);
    return arr;
  }, [rows]);

  const weekExpenseMap = useMemo(() => {
    const map = {};
    for (const [cat, amt] of categoryTotals) map[cat] = safeNum(amt);
    return map;
  }, [categoryTotals]);

  const weekInsights = useMemo(
    () =>
      buildInsights({
        revenueTotal: 0,
        expensesTotal: total,
        expensesByCategory: weekExpenseMap,
        scopeLabel: "This week",
      }),
    [total, weekExpenseMap]
  );

  const topCat = useMemo(() => {
    let best = null;
    for (const [name, value] of categoryTotals) {
      if (name === "Other") continue;
      if (!best || value > best.value) best = { name, value };
    }
    if (!best || best.value <= 0) return null;
    return best;
  }, [categoryTotals]);

  const paymentList = useMemo(() => {
    const arr = [
      ["Cash", byPayment.cash],
      ["Card", byPayment.card],
      ["Bank", byPayment.bank],
      ["Cheque", byPayment.cheque],
      ["Other", byPayment.other],
    ];
    return arr.sort((a, b) => b[1] - a[1]);
  }, [byPayment]);

  const dayTotals = useMemo(() => groupByDay(rows, weekStartISO), [rows, weekStartISO]);
  const maxDay = useMemo(() => Math.max(0, ...dayTotals.map((d) => d.total)), [dayTotals]);

  const biggestDay = useMemo(() => {
    if (!maxDay) return null;
    return dayTotals.reduce((best, d) => (d.total > (best?.total || 0) ? d : best), null);
  }, [dayTotals, maxDay]);

  const statusTag = useMemo(() => {
    if (!total) return { text: "No expenses", tone: "neutral" };
    if (deltaPct > 0.5) return { text: "Spending up", tone: "bad" };
    if (deltaPct < -0.5) return { text: "Spending down", tone: "good" };
    return { text: "Stable", tone: "neutral" };
  }, [total, deltaPct]);

  // itens do dia selecionado
  const dayItems = useMemo(() => {
    if (!openDay?.iso) return [];
    const iso = openDay.iso;

    return rows
      .filter((e) => pickExpenseISO(e) === iso)
      .slice()
      .sort((a, b) => {
        const aa = String(a.createdAtISO || a.createdAt || "");
        const bb = String(b.createdAtISO || b.createdAt || "");
        return bb.localeCompare(aa);
      });
  }, [rows, openDay]);

  const dayTotal = useMemo(() => dayItems.reduce((s, r) => s + safeNum(r.amount), 0), [dayItems]);
  const dayByPayment = useMemo(() => sumPayment(dayItems), [dayItems]);

  const dayExpenseMap = useMemo(() => {
    const map = {};
    for (const e of dayItems) {
      const cat = String(e.category || "Other").trim() || "Other";
      map[cat] = (map[cat] || 0) + safeNum(e.amount);
    }
    return map;
  }, [dayItems]);

  const dayInsights = useMemo(
    () =>
      buildInsights({
        revenueTotal: 0,
        expensesTotal: dayTotal,
        expensesByCategory: dayExpenseMap,
        scopeLabel: "This day",
      }),
    [dayTotal, dayExpenseMap]
  );

  // ✅ força weekStart ser sempre Monday quando o user escolhe uma data
  function onPickWeekStart(e) {
    const iso = e.target.value;
    const d = new Date(iso + "T00:00:00");
    if (Number.isNaN(d.getTime())) return setWeekStartISO(iso);
    const monday = startOfWeekMonday(d);
    setWeekStartISO(toISO(monday));
  }

  return (
    <div className="pageWrap weeklyPremium">
      <div className="wHeader">
        <div>
          <div className="wTitleRow">
            <h2 className="wTitle">Weekly Expenses</h2>
            <span className={`wTag ${statusTag.tone}`}>{statusTag.text}</span>
          </div>

          <div className="wSub">
            {weekStartISO} → {weekEndISO} <span className="wSubDot">•</span>{" "}
            Compared to {prevStartISO} → {prevEndISO}
          </div>
        </div>

        <div className="wHeaderRight">{loading ? <div className="wLoading">Loading…</div> : null}</div>
      </div>

      <section className="wCard">
        <div className="wControls">
          <div>
            <div className="wLabelSmall">Week starts (Monday)</div>
            <input type="date" value={weekStartISO} onChange={onPickWeekStart} className="wDate" />
          </div>

          <div className="wChip">
            Total: <b>{money(total, currency)}</b>
          </div>

          <div className="wChip">
            Change:{" "}
            <b className={delta <= 0 ? "wGood" : "wBad"}>
              {delta === 0 ? money(0, currency) : `${delta > 0 ? "+" : ""}${money(delta, currency)}`}
            </b>{" "}
            <TrendPill deltaPct={deltaPct} />
          </div>

          <div className="wChip">
            Avg/day: <b>{money(avgDay, currency)}</b>
          </div>

          <div className="wChip">
            Records: <b>{count}</b>
          </div>
        </div>
      </section>

      <div className="wKpiGrid">
        <div className="wCard wKpi">
          <div className="wKpiLabel">This week</div>
          <div className="wKpiValue">{money(total, currency)}</div>
          <div className="wKpiHint">Total expenses (Mon → Sun)</div>
        </div>

        <div className="wCard wKpi">
          <div className="wKpiLabel">Last week</div>
          <div className="wKpiValue">{money(prevTotal, currency)}</div>
          <div className="wKpiHint">Baseline for comparison</div>
        </div>

        <div className="wCard wKpi">
          <div className="wKpiLabel">Top cost driver</div>
          <div className="wKpiValue">{topCat?.name || "—"}</div>
          <div className="wKpiHint">{topCat ? money(topCat.value, currency) : "No data"}</div>
        </div>

        <div className="wCard wKpi">
          <div className="wKpiLabel">Highest day</div>
          <div className="wKpiValue">{biggestDay?.key || "—"}</div>
          <div className="wKpiHint">{biggestDay ? money(biggestDay.total, currency) : "No data"}</div>
        </div>
      </div>

      <div className="wGrid2">
        <section className="wCard">
          <div className="wCardTitle">Daily spend</div>
          <div className="wMuted">Click a day to see full movement for that date.</div>

          <div className="wMiniChart">
            {dayTotals.map((d) => {
              const h = maxDay ? Math.round((d.total / maxDay) * 120) : 0;
              const isActive = openDay?.iso === d.iso;

              return (
                <button
                  key={d.key}
                  type="button"
                  className={`wMiniColBtn ${isActive ? "active" : ""}`}
                  onClick={() => setOpenDay({ key: d.key, iso: d.iso })}
                  title={`${d.key} (${d.iso}): ${money(d.total, currency)} • ${d.count} records`}
                >
                  <div className="wMiniBar" style={{ height: `${h}px` }} />
                  <div className="wMiniLabel">{d.key}</div>
                </button>
              );
            })}
          </div>

          <div className="wHintTiny">Tip: click a bar to open details.</div>
        </section>

        <section className="wCard">
          <div className="wCardTitle">Insights</div>

          <div className="wInsight">
            <div className="wInsightLabel">Trend</div>
            <div className="wInsightValue">
              {deltaPct > 0.5
                ? "Higher spending than last week"
                : deltaPct < -0.5
                ? "Lower spending than last week"
                : "Similar to last week"}{" "}
              <TrendPill deltaPct={deltaPct} />
            </div>
          </div>

          <div className="wInsight">
            <div className="wInsightLabel">Focus</div>
            <div className="wInsightValue">
              {topCat ? (
                <>
                  Watch <b>{topCat.name}</b> — it represents{" "}
                  <b>{pct(topCat.value, Math.max(1, total)).toFixed(0)}%</b> of spending.
                </>
              ) : (
                "No category data yet."
              )}
            </div>
          </div>

          <div className="wInsight">
            <div className="wInsightLabel">Highest day</div>
            <div className="wInsightValue">
              {biggestDay ? (
                <>
                  <b>{biggestDay.key}</b> was the highest day with <b>{money(biggestDay.total, currency)}</b>.
                </>
              ) : (
                "No daily info found."
              )}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <InsightsCard
              title="Where you're losing money & how to improve"
              subtitle="Based on expense patterns (add revenue in Daily to unlock full margin tips)"
              losing={weekInsights.losing}
              improve={weekInsights.improve}
            />
          </div>
        </section>
      </div>

      <div className="wGrid2">
        <section className="wCard">
          <div className="wCardTitle">Expense breakdown</div>
          <div className="wMuted">Your standard categories (fixed list).</div>

          {loading ? (
            <div className="wMuted">Loading…</div>
          ) : total === 0 ? (
            <div className="wMuted">No expenses in this period.</div>
          ) : (
            <div className="wList">
              {categoryTotals.map(([cat, amt]) => (
                <BarRow key={cat} label={cat} value={amt} total={Math.max(1, total)} currency={currency} />
              ))}
            </div>
          )}
        </section>

        <section className="wCard">
          <div className="wCardTitle">Payment methods</div>

          {loading ? (
            <div className="wMuted">Loading…</div>
          ) : total === 0 ? (
            <div className="wMuted">No expenses in this period.</div>
          ) : (
            <div className="wList">
              {paymentList.map(([label, amt]) => (
                <BarRow key={label} label={label} value={amt} total={Math.max(1, total)} currency={currency} />
              ))}
            </div>
          )}
        </section>
      </div>

      {openDay && (
        <div
          className="wDayOverlay"
          role="dialog"
          aria-label="Daily movement"
          onClick={() => setOpenDay(null)} // ✅ clicar fora fecha
        >
          <div className="wDayModal" onClick={(e) => e.stopPropagation()}>
            <div className="wDayTop">
              <div>
                <div className="wDayTitle">Daily movement</div>
                <div className="wDaySub">
                  {openDay.key} • {openDay.iso}
                </div>
              </div>

              <button type="button" className="wDayClose" onClick={() => setOpenDay(null)} aria-label="Close">
                ✕
              </button>
            </div>

            <div className="wDayKpis">
              <div className="wDayKpi">
                <div className="wDayKpiLabel">Total</div>
                <div className="wDayKpiValue">{money(dayTotal, currency)}</div>
              </div>
              <div className="wDayKpi">
                <div className="wDayKpiLabel">Records</div>
                <div className="wDayKpiValue">{dayItems.length}</div>
              </div>
              <div className="wDayKpi">
                <div className="wDayKpiLabel">Cash</div>
                <div className="wDayKpiValue">{money(dayByPayment.cash, currency)}</div>
              </div>
              <div className="wDayKpi">
                <div className="wDayKpiLabel">Card</div>
                <div className="wDayKpiValue">{money(dayByPayment.card, currency)}</div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <InsightsCard
                title="Daily insights"
                subtitle="Fast diagnosis for this day"
                losing={dayInsights.losing}
                improve={dayInsights.improve}
              />
            </div>

            {dayItems.length === 0 ? (
              <div className="wMuted">No expenses recorded for this day.</div>
            ) : (
              <div className="wDayList">
                {dayItems.map((e, idx) => {
                  const amt = safeNum(e.amount);
                  const cat = String(e.category || "—");
                  const pm = formatPM(e.paymentMethod);
                  const note = e.note || e.description || e.title || "";

                  return (
                    <div key={e.id || `${openDay.iso}-${idx}`} className="wDayRow">
                      <div className="wDayLeft">
                        <div className="wDayRowTitle">{cat}</div>
                        <div className="wDayRowMeta">
                          {pm}
                          {note ? ` • ${note}` : ""}
                        </div>
                      </div>
                      <div className="wDayAmt">{money(amt, currency)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="wDayFooter">
              <button type="button" className="wDayBtn" onClick={() => setOpenDay(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
