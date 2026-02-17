import React, { useEffect, useMemo, useState } from "react";
import { usePeriod } from "../../context/PeriodContext.jsx";
import { listDailyReportsByRange } from "../../firebase/reports";
import "../../styles/pages.css";
import "./Monthly.css";

import DonutChart from "../../components/charts/DonutChart";
import { CAT_COLORS } from "../../constants/categories";
import { money } from "../../utils/money";

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

function pct(part, total) {
  if (!total) return 0;
  return (part / total) * 100;
}

function formatMonthTitle(month, year) {
  const d = new Date(`${year}-${pad2(month)}-01T00:00:00`);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function ProgressRow({ label, value, total, currency }) {
  const p = Math.min(100, Math.max(0, pct(value, total)));
  return (
    <div className="mRow">
      <div className="mRowTop">
        <div className="mRowLabel">{label}</div>
        <div className="mRowVal">{money(value, currency)}</div>
      </div>
      <div className="mBarTrack" aria-hidden="true">
        <div className="mBarFill" style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

// best-effort: extract cash/card if you later store them inside totals
function extractPayments(row) {
  const t = row?.totals || {};

  const revenueCash =
    safeNum(t?.revenueCash) ||
    safeNum(t?.payments?.revenueCash) ||
    safeNum(t?.paymentTotals?.revenueCash) ||
    safeNum(t?.cash?.revenue);

  const revenueCard =
    safeNum(t?.revenueCard) ||
    safeNum(t?.payments?.revenueCard) ||
    safeNum(t?.paymentTotals?.revenueCard) ||
    safeNum(t?.card?.revenue);

  const expenseCash =
    safeNum(t?.expenseCash) ||
    safeNum(t?.expensesCash) ||
    safeNum(t?.payments?.expenseCash) ||
    safeNum(t?.paymentTotals?.expenseCash) ||
    safeNum(t?.cash?.expense);

  const expenseCard =
    safeNum(t?.expenseCard) ||
    safeNum(t?.expensesCard) ||
    safeNum(t?.payments?.expenseCard) ||
    safeNum(t?.paymentTotals?.expenseCard) ||
    safeNum(t?.card?.expense);

  return { revenueCash, revenueCard, expenseCash, expenseCard };
}

export default function Monthly() {
  const restaurantId = "kobi-123";
  const { year, month, currency } = usePeriod();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("expenses"); // "expenses" | "revenue"

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      const start = `${year}-${pad2(month)}-01`;
      const endDate = new Date(year, month, 0);
      const end = `${year}-${pad2(month)}-${pad2(endDate.getDate())}`;

      try {
        const data = await listDailyReportsByRange(restaurantId, start, end);
        if (alive) setRows(Array.isArray(data) ? data : []);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [restaurantId, year, month]);

  const daysCount = rows.length;

  const revenue = useMemo(
    () => rows.reduce((s, r) => s + safeNum(r?.totals?.revenueTotal), 0),
    [rows]
  );
  const expenses = useMemo(
    () => rows.reduce((s, r) => s + safeNum(r?.totals?.expensesTotal), 0),
    [rows]
  );

  const profit = revenue - expenses;
  const margin = revenue ? (profit / revenue) * 100 : 0;

  const avgRevenueDay = daysCount ? revenue / daysCount : 0;
  const avgExpensesDay = daysCount ? expenses / daysCount : 0;

  // Cash vs Card
  const paymentTotals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const p = extractPayments(r);
        acc.revenueCash += p.revenueCash;
        acc.revenueCard += p.revenueCard;
        acc.expenseCash += p.expenseCash;
        acc.expenseCard += p.expenseCard;
        return acc;
      },
      { revenueCash: 0, revenueCard: 0, expenseCash: 0, expenseCard: 0 }
    );
  }, [rows]);

  const hasPaymentSplit =
    paymentTotals.revenueCash +
      paymentTotals.revenueCard +
      paymentTotals.expenseCash +
      paymentTotals.expenseCard >
    0;

  // ✅ Category totals (fixed categories + optional Other)
  const byCat = useMemo(() => {
    const base = {};
    for (const c of CORE_CATEGORIES) base[c] = { revenue: 0, expense: 0 };
    let other = { revenue: 0, expense: 0 };

    for (const r of rows) {
      const ct = r?.totals?.categoryTotals;
      if (!ct) continue;

      for (const [k, v] of Object.entries(ct)) {
        const key = String(k || "").trim();
        const rev = safeNum(v?.revenue);
        const exp = safeNum(v?.expense);

        if (CORE_CATEGORIES.includes(key)) {
          base[key].revenue += rev;
          base[key].expense += exp;
        } else {
          other.revenue += rev;
          other.expense += exp;
        }
      }
    }

    return { base, other };
  }, [rows]);

  const includeOtherExpenses = byCat.other.expense > 0;
  const includeOtherRevenue = byCat.other.revenue > 0;

  const expensePie = useMemo(() => {
    const arr = CORE_CATEGORIES.map((c) => ({
      label: c,
      value: safeNum(byCat.base[c]?.expense),
    }));
    if (includeOtherExpenses) arr.push({ label: "Other", value: safeNum(byCat.other.expense) });
    return arr;
  }, [byCat, includeOtherExpenses]);

  const revenuePie = useMemo(() => {
    const arr = CORE_CATEGORIES.map((c) => ({
      label: c,
      value: safeNum(byCat.base[c]?.revenue),
    }));
    if (includeOtherRevenue) arr.push({ label: "Other", value: safeNum(byCat.other.revenue) });
    return arr;
  }, [byCat, includeOtherRevenue]);

  // ✅ Colors aligned with pie order
  const pieColors = useMemo(() => {
    const baseColors = Array.isArray(CAT_COLORS) ? CAT_COLORS : [];
    const needed = CORE_CATEGORIES.length + (includeOtherExpenses || includeOtherRevenue ? 1 : 0);
    const out = [];
    for (let i = 0; i < needed; i++) out.push(baseColors[i] || "rgba(255,255,255,.6)");
    return out;
  }, [includeOtherExpenses, includeOtherRevenue]);

  // ✅ List: show ALL categories (not top 5)
  const listForTab = useMemo(() => {
    return (tab === "expenses" ? expensePie : revenuePie).slice();
  }, [tab, expensePie, revenuePie]);

  const healthTag = useMemo(() => {
    if (!revenue && !expenses) return { text: "No data", tone: "neutral" };
    if (profit > 0 && margin >= 15) return { text: "Healthy month", tone: "good" };
    if (profit > 0) return { text: "Profit OK", tone: "neutral" };
    return { text: "Cost warning", tone: "bad" };
  }, [revenue, expenses, profit, margin]);

  const subtitle = `${pad2(month)}/${year} • ${daysCount} day(s) with data`;

  return (
    <div className="pageWrap monthlyLight">
      <div className="mHeader">
        <div>
          <div className="mTitleRow">
            <h2 className="mTitle">Monthly Overview</h2>
            <span className={`mTag ${healthTag.tone}`}>{healthTag.text}</span>
          </div>
          <div className="mSub">
            {formatMonthTitle(month, year)} • {subtitle}
          </div>
        </div>

        <div className="mHeaderRight">{loading ? <div className="mLoading">Loading…</div> : null}</div>
      </div>

      {/* KPI CARDS */}
      <div className="mKpiGrid">
        <div className="mKpiCard">
          <div className="mKpiLabel">Revenue</div>
          <div className="mKpiValue good">{money(revenue, currency)}</div>
          <div className="mKpiHint">Avg/day: {money(avgRevenueDay, currency)}</div>
        </div>

        <div className="mKpiCard">
          <div className="mKpiLabel">Expenses</div>
          <div className="mKpiValue bad">{money(expenses, currency)}</div>
          <div className="mKpiHint">Avg/day: {money(avgExpensesDay, currency)}</div>
        </div>

        <div className="mKpiCard">
          <div className="mKpiLabel">Net Profit</div>
          <div className={`mKpiValue ${profit >= 0 ? "good" : "bad"}`}>{money(profit, currency)}</div>
          <div className="mKpiHint">{profit >= 0 ? "Positive ✅" : "Negative ⚠️"}</div>
        </div>

        <div className="mKpiCard">
          <div className="mKpiLabel">Margin</div>
          <div className="mKpiValue">{margin.toFixed(1)}%</div>
          <div className="mKpiHint">Profit ÷ Revenue</div>
        </div>
      </div>

      {/* CASH vs CARD */}
      <section className="mSection">
        <div className="mSectionHead">
          <div className="mSectionTitle">Cash vs Card</div>
          {!hasPaymentSplit ? (
            <div className="mSectionNote">
              (No cash/card fields found yet — when you add them, this will fill automatically.)
            </div>
          ) : null}
        </div>

        <div className="mSplitGrid">
          <div className="mPanel">
            <div className="mPanelTitle">Inflow (Revenue)</div>
            <div className="mPanelBig">{money(revenue, currency)}</div>

            <div className="mSplitRows">
              <ProgressRow
                label="Cash"
                value={paymentTotals.revenueCash}
                total={Math.max(1, paymentTotals.revenueCash + paymentTotals.revenueCard)}
                currency={currency}
              />
              <ProgressRow
                label="Card"
                value={paymentTotals.revenueCard}
                total={Math.max(1, paymentTotals.revenueCash + paymentTotals.revenueCard)}
                currency={currency}
              />
            </div>
          </div>

          <div className="mPanel">
            <div className="mPanelTitle">Outflow (Expenses)</div>
            <div className="mPanelBig">{money(expenses, currency)}</div>

            <div className="mSplitRows">
              <ProgressRow
                label="Cash"
                value={paymentTotals.expenseCash}
                total={Math.max(1, paymentTotals.expenseCash + paymentTotals.expenseCard)}
                currency={currency}
              />
              <ProgressRow
                label="Card"
                value={paymentTotals.expenseCard}
                total={Math.max(1, paymentTotals.expenseCash + paymentTotals.expenseCard)}
                currency={currency}
              />
            </div>
          </div>
        </div>
      </section>

      {/* CATEGORIES (TABS) */}
      <section className="mSection">
        <div className="mSectionHead">
          <div className="mSectionTitle">Categories</div>

          <div className="mTabs">
            <button
              className={`mTab ${tab === "expenses" ? "active" : ""}`}
              onClick={() => setTab("expenses")}
              type="button"
            >
              Expenses
            </button>
            <button
              className={`mTab ${tab === "revenue" ? "active" : ""}`}
              onClick={() => setTab("revenue")}
              type="button"
            >
              Revenue
            </button>
          </div>
        </div>

        <div className="mCatGrid">
          <div className="mChartCard">
            {tab === "expenses" ? (
              <DonutChart
                title="Expenses by category"
                data={expensePie}
                colors={pieColors}
                formatValue={(v) => money(v, currency)}
                currencyText={money(expenses, currency)}
              />
            ) : (
              <DonutChart
                title="Revenue by category"
                data={revenuePie}
                colors={pieColors}
                formatValue={(v) => money(v, currency)}
                currencyText={money(revenue, currency)}
              />
            )}
          </div>

          <div className="mListCard">
            <div className="mListTitle">
              Categories • {tab === "expenses" ? "Expenses" : "Revenue"}
            </div>

            <div className="mList">
              {listForTab.map((x) => (
                <ProgressRow
                  key={x.label}
                  label={x.label}
                  value={x.value}
                  total={Math.max(1, tab === "expenses" ? expenses : revenue)}
                  currency={currency}
                />
              ))}
            </div>

            <div className="mSummaryLine">
              This month result:{" "}
              <b className={profit >= 0 ? "good" : "bad"}>{money(profit, currency)}</b>{" "}
              • Margin <b>{margin.toFixed(1)}%</b>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
