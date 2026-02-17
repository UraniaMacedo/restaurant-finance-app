import React, { useEffect, useMemo, useState } from "react";
import { listExpensesByDateRange } from "../../firebase/expenses";
import DonutChart from "../../components/charts/DonutChart";
import { CAT_COLORS } from "../../constants/categories";
import { usePeriod } from "../../context/PeriodContext.jsx";
import "../../styles/pages.css";
import { money } from "../../utils/money";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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

function pad2(n) {
  return String(n).padStart(2, "0");
}

function safeNum(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function monthKey(yyyy, mm) {
  return `${yyyy}-${pad2(mm)}`; // YYYY-MM
}

export default function Annual() {
  const restaurantId = "kobi-123";
  const { currency = "EUR" } = usePeriod();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [pickedMonth, setPickedMonth] = useState(null); // "YYYY-MM" | null

  const [expensesRows, setExpensesRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ✅ Revenue via localStorage (enquanto Daily não salva no Firebase)
  const revenueRowsLS = useMemo(() => {
    const key = "kobi_daily_reports";
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    return arr.filter((r) => String(r?.dateKey || "").startsWith(String(year)));
  }, [year]);

  const revenueYear = useMemo(() => {
    return revenueRowsLS.reduce((sum, r) => sum + safeNum(r?.totals?.incomeTotal), 0);
  }, [revenueRowsLS]);

  const revenueByMonth = useMemo(() => {
    const map = new Map();
    for (const r of revenueRowsLS) {
      const ym = String(r?.dateKey || "").slice(0, 7); // YYYY-MM
      if (!ym) continue;
      map.set(ym, (map.get(ym) || 0) + safeNum(r?.totals?.incomeTotal));
    }
    return map;
  }, [revenueRowsLS]);

  // ✅ Revenue by category (Year) a partir do localStorage payload.income
  // Se você NÃO tiver isso salvo, vai cair em "Other"
  const revenueByCatYear = useMemo(() => {
    const base = {};
    for (const c of CORE_CATEGORIES) base[c] = 0;
    let other = 0;

    for (const r of revenueRowsLS) {
      // no teu saveDayLocal mais recente você salva:
      // payload.income: { cash, card, deliveryApps }
      const inc = r?.income || {};
      const cash = safeNum(inc.cash);
      const card = safeNum(inc.card);
      const delivery = safeNum(inc.deliveryApps);

      // Não temos categorias "Cash/Card/Delivery apps" na lista fixa de despesas,
      // então tratamos como "Other" (ou você pode criar "Cash/Card/Delivery apps" no revenue donut se quiser)
      other += cash + card + delivery;
    }

    // Se você preferir ver Revenue por categoria como "Cash/Card/Delivery apps",
    // me fala e eu adapto o donut de revenue do Annual pra essas 3 categorias.
    return { base, other };
  }, [revenueRowsLS]);

  useEffect(() => {
    // ao trocar o ano, limpa seleção
    setPickedMonth(null);
    let alive = true;

    async function load() {
      setLoading(true);

      const start = `${year}-01-01`;
      const end = `${year}-12-31`;

      try {
        const data = await listExpensesByDateRange(restaurantId, start, end);
        if (!alive) return;
        setExpensesRows(Array.isArray(data) ? data : []);
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, [restaurantId, year]);

  const yearOptions = useMemo(() => {
    // range dinâmico: 5 anos para trás e 1 para frente
    const arr = [];
    for (let y = currentYear - 5; y <= currentYear + 1; y++) arr.push(y);
    return arr;
  }, [currentYear]);

  const expensesYear = useMemo(() => {
    return expensesRows.reduce((sum, r) => sum + safeNum(r?.amount), 0);
  }, [expensesRows]);

  const expensesByMonth = useMemo(() => {
    const map = new Map();
    for (const r of expensesRows) {
      const ym = String(r?.date || "").slice(0, 7); // YYYY-MM
      if (!ym) continue;
      map.set(ym, (map.get(ym) || 0) + safeNum(r?.amount));
    }
    return map;
  }, [expensesRows]);

  // ✅ Expenses by category (Year) com lista fixa + Other
  const expensesByCatYear = useMemo(() => {
    const base = {};
    for (const c of CORE_CATEGORIES) base[c] = 0;
    let other = 0;

    for (const r of expensesRows) {
      const cat = String(r?.category || "").trim();
      const amt = safeNum(r?.amount);

      if (CORE_CATEGORIES.includes(cat)) base[cat] += amt;
      else other += amt;
    }

    return { base, other };
  }, [expensesRows]);

  // ✅ 12 meses do ano
  const months = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const mm = i + 1;
      const key = monthKey(year, mm); // YYYY-MM
      const rev = safeNum(revenueByMonth.get(key));
      const exp = safeNum(expensesByMonth.get(key));
      const prof = rev - exp;
      return { key, rev, exp, prof };
    });
  }, [year, revenueByMonth, expensesByMonth]);

  const picked = useMemo(() => {
    if (!pickedMonth) return null;
    const m = months.find((x) => x.key === pickedMonth);
    if (!m) return null;

    // revenue split do mês (cash/card/delivery) via localStorage
    const revRowsMonth = revenueRowsLS.filter((r) => String(r?.dateKey || "").slice(0, 7) === pickedMonth);
    const revCash = revRowsMonth.reduce((s, r) => s + safeNum(r?.income?.cash), 0);
    const revCard = revRowsMonth.reduce((s, r) => s + safeNum(r?.income?.card), 0);
    const revDelivery = revRowsMonth.reduce((s, r) => s + safeNum(r?.income?.deliveryApps), 0);

    // top categorias de despesas do mês
    const expRowsMonth = expensesRows.filter((r) => String(r?.date || "").slice(0, 7) === pickedMonth);
    const catMap = new Map();
    for (const r of expRowsMonth) {
      const cat = String(r?.category || "Other").trim() || "Other";
      catMap.set(cat, (catMap.get(cat) || 0) + safeNum(r?.amount));
    }
    const topCats = Array.from(catMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }));

    const margin = m.rev ? (m.prof / m.rev) * 100 : 0;

    return {
      key: pickedMonth,
      rev: m.rev,
      exp: m.exp,
      prof: m.prof,
      margin,
      revSplit: { cash: revCash, card: revCard, delivery: revDelivery },
      topCats,
      daysWithRevenue: new Set(revRowsMonth.map((r) => String(r?.dateKey || "").slice(0, 10))).size,
      expensesCount: expRowsMonth.length,
    };
  }, [pickedMonth, months, revenueRowsLS, expensesRows]);

  const profitYear = revenueYear - expensesYear;

  const marginYear = useMemo(() => {
    if (!revenueYear) return 0;
    return (profitYear / revenueYear) * 100;
  }, [profitYear, revenueYear]);

  const maxAbs = useMemo(() => {
    let m = 1;
    for (const x of months) m = Math.max(m, x.rev, x.exp, Math.abs(x.prof));
    return m;
  }, [months]);

  const bestMonth = useMemo(() => months.reduce((a, b) => (b.prof > a.prof ? b : a), months[0]), [months]);
  const worstMonth = useMemo(() => months.reduce((a, b) => (b.prof < a.prof ? b : a), months[0]), [months]);
  const highestRevMonth = useMemo(() => months.reduce((a, b) => (b.rev > a.rev ? b : a), months[0]), [months]);
  const highestExpMonth = useMemo(() => months.reduce((a, b) => (b.exp > a.exp ? b : a), months[0]), [months]);

  // ✅ Donuts (fixed order + optional Other)
  const expensePie = useMemo(() => {
    const arr = CORE_CATEGORIES.map((c) => ({
      label: c,
      value: safeNum(expensesByCatYear.base[c]),
    }));
    if (expensesByCatYear.other > 0) arr.push({ label: "Other", value: safeNum(expensesByCatYear.other) });
    return arr;
  }, [expensesByCatYear]);

  const revenuePie = useMemo(() => {
    // Como teu revenue está vindo do localStorage como income (cash/card/delivery),
    // aqui eu coloco tudo em "Other" pra não inventar categorias.
    // Se quiser eu mudo pra donut com 3 fatias: Cash / Card / Delivery apps.
    const arr = CORE_CATEGORIES.map((c) => ({ label: c, value: safeNum(revenueByCatYear.base[c]) }));
    if (revenueByCatYear.other > 0) arr.push({ label: "Other", value: safeNum(revenueByCatYear.other) });
    return arr;
  }, [revenueByCatYear]);

  const pieColors = useMemo(() => {
    const baseColors = Array.isArray(CAT_COLORS) ? CAT_COLORS : [];
    const needed = Math.max(expensePie.length, revenuePie.length);
    const out = [];
    for (let i = 0; i < needed; i++) out.push(baseColors[i] || "rgba(255,255,255,.6)");
    return out;
  }, [expensePie.length, revenuePie.length]);

  return (
    <div className="pageWrap">
      <div className="pageHeader">
        <div>
          <h2 className="pageTitle">Annual Overview</h2>
          <div className="pageSub">Year: {year}</div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            style={{
              padding: 10,
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.14)",
              background: "rgba(0,0,0,.15)",
              color: "inherit",
              fontWeight: 900,
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {loading ? <div className="pageSub">Loading…</div> : null}
        </div>
      </div>

      {/* TOP CARDS */}
      <div className="execGrid">
        <div className="execCard">
          <div className="execLabel">Revenue</div>
          <div className="execValue good">{money(revenueYear, currency)}</div>
        </div>

        <div className="execCard">
          <div className="execLabel">Expenses</div>
          <div className="execValue bad">{money(expensesYear, currency)}</div>
        </div>

        <div className="execCard">
          <div className="execLabel">Net Profit</div>
          <div className={`execValue ${profitYear >= 0 ? "good" : "bad"}`}>
            {money(profitYear, currency)}
          </div>
        </div>

        <div className="execCard">
          <div className="execLabel">Profit Margin</div>
          <div className="execValue">{marginYear.toFixed(1)}%</div>
        </div>
      </div>

      {/* MONTH BARS */}
      <section className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 950, marginBottom: 6 }}>Profit by month</div>
        <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 12 }}>
          Green = profit • Red = loss
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 10, alignItems: "end" }}>
          {months.map((m, i) => {
            const h = Math.max(6, Math.round((Math.abs(m.prof) / maxAbs) * 160));
            const isGood = m.prof >= 0;
            const label = MONTH_LABELS[i] || m.key?.slice(5);
            const isPicked = pickedMonth === m.key;

            return (
              <div key={m.key} style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                <div
                  title={`${m.key}\nProfit: ${money(m.prof, currency)}\nRevenue: ${money(m.rev, currency)}\nExpenses: ${money(m.exp, currency)}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPickedMonth(m.key)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setPickedMonth(m.key);
                  }}
                  style={{
                    width: "100%",
                    height: h,
                    borderRadius: 14,
                    border: isPicked ? "1px solid rgba(255,255,255,.55)" : "1px solid rgba(255,255,255,.10)",
                    background: isGood ? "rgba(120,255,170,.35)" : "rgba(255,120,120,.35)",
                    outline: "none",
                    cursor: "pointer",
                  }}
                />
                <div style={{ fontSize: 11, opacity: 0.8 }}>{label}</div>
              </div>
            );
          })}
        </div>

        {/* MINI RELATÓRIO DO MÊS */}
        {picked ? (
          <div style={{ marginTop: 16, padding: 14, borderRadius: 16, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.03)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div>
                <div style={{ fontWeight: 950 }}>Mini report — {picked.key}</div>
                <div style={{ opacity: 0.75, fontSize: 12 }}>
                  {picked.daysWithRevenue} day(s) with revenue • {picked.expensesCount} expense item(s)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickedMonth(null)}
                style={{
                  padding: "8px 12px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "rgba(0,0,0,.15)",
                  color: "inherit",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)" }}>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Revenue</div>
                <div style={{ fontWeight: 950 }}>{money(picked.rev, currency)}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)" }}>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Expenses</div>
                <div style={{ fontWeight: 950 }}>{money(picked.exp, currency)}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)" }}>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Profit</div>
                <div style={{ fontWeight: 950 }}>{money(picked.prof, currency)}</div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)" }}>
                <div style={{ opacity: 0.75, fontSize: 12 }}>Margin</div>
                <div style={{ fontWeight: 950 }}>{picked.margin.toFixed(1)}%</div>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)" }}>
                <div style={{ fontWeight: 950, marginBottom: 8 }}>Revenue split (from Daily)</div>
                <div style={{ display: "grid", gap: 6, opacity: 0.9 }}>
                  <div>Cash: <b>{money(picked.revSplit.cash, currency)}</b></div>
                  <div>Card: <b>{money(picked.revSplit.card, currency)}</b></div>
                  <div>Delivery apps: <b>{money(picked.revSplit.delivery, currency)}</b></div>
                </div>
              </div>

              <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)" }}>
                <div style={{ fontWeight: 950, marginBottom: 8 }}>Top expense categories</div>
                {picked.topCats.length ? (
                  <div style={{ display: "grid", gap: 6, opacity: 0.9 }}>
                    {picked.topCats.map((c) => (
                      <div key={c.name} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <span>{c.name}</span>
                        <b>{money(c.value, currency)}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ opacity: 0.75 }}>No expenses in this month.</div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 14, opacity: 0.75, fontSize: 12 }}>
            Tip: click a month bar to open a mini report.
          </div>
        )}

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.03)" }}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Best month</div>
            <div style={{ fontWeight: 950 }}>{bestMonth?.key}</div>
            <div style={{ opacity: 0.9 }}>{money(bestMonth?.prof, currency)}</div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.03)" }}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Worst month</div>
            <div style={{ fontWeight: 950 }}>{worstMonth?.key}</div>
            <div style={{ opacity: 0.9 }}>{money(worstMonth?.prof, currency)}</div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.03)" }}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Highest revenue</div>
            <div style={{ fontWeight: 950 }}>{highestRevMonth?.key}</div>
            <div style={{ opacity: 0.9 }}>{money(highestRevMonth?.rev, currency)}</div>
          </div>

          <div style={{ padding: 12, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.03)" }}>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Highest expense</div>
            <div style={{ fontWeight: 950 }}>{highestExpMonth?.key}</div>
            <div style={{ opacity: 0.9 }}>{money(highestExpMonth?.exp, currency)}</div>
          </div>
        </div>
      </section>

      {/* DONUTS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <DonutChart
          title="Expenses by Category (Year)"
          data={expensePie}
          colors={pieColors}
          formatValue={(v) => money(v, currency)}
          currencyText={money(expensesYear, currency)}
        />

        <DonutChart
          title="Revenue by Category (Year)"
          data={revenuePie}
          colors={pieColors}
          formatValue={(v) => money(v, currency)}
          currencyText={money(revenueYear, currency)}
        />
      </div>

      <section className="card" style={{ marginTop: 16 }}>
        <div style={{ fontWeight: 950, marginBottom: 8 }}>Executive summary</div>
        <div style={{ opacity: 0.9, lineHeight: 1.5 }}>
          In <b>{year}</b>, the restaurant generated <b>{money(revenueYear, currency)}</b> in revenue and spent{" "}
          <b>{money(expensesYear, currency)}</b> in expenses, resulting in{" "}
          <b>{money(profitYear, currency)}</b> net profit with a margin of <b>{marginYear.toFixed(1)}%</b>.
        </div>
      </section>
    </div>
  );
}
