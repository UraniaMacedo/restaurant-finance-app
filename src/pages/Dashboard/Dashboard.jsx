import React, { useMemo, useState, useEffect } from "react";
import { createExpense } from "../../firebase/expenses";
import { PAYMENT_METHODS } from "../../constants/paymentMethods";
import { usePeriod } from "../../context/PeriodContext.jsx";
import "./Dashboard.css";
import { upsertDailyReport } from "../../firebase/reports";
import { money } from "../../utils/money";
import DonutChart from "../../components/charts/DonutChart";
import { useAuth } from "../../context/AuthContext.jsx";
import InsightsCard from "../../components/InsightsCard";
import { buildInsights } from "../../utils/insightEngine";

const BRAND = "Kobi hibachi & sushi";
const RESTAURANT_ID = "kobi-123";

function todayKey() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ✅ accepts: 1000 | 1.000 | 1.000,50 | 1000.50 | 1,000.50 | 1 000,50
function num(v) {
  if (v === null || v === undefined) return 0;
  let s = String(v).trim();
  if (!s) return 0;

  s = s.replace(/\s/g, "");

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    if (s.lastIndexOf(",") < s.lastIndexOf(".")) {
      // US: 1,234.56
      s = s.replace(/,/g, "");
    } else {
      // PT/BR: 1.234,56
      s = s.replace(/\./g, "");
      s = s.replace(",", ".");
    }
  } else if (hasComma && !hasDot) {
    s = s.replace(",", ".");
  } else if (!hasComma && hasDot) {
    const parts = s.split(".");
    const last = parts[parts.length - 1];
    if (last.length === 3) s = s.replace(/\./g, "");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

function safeNum(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

/** ✅ Categorias fixas */
export const FIXED_CATS = [
  "Drinks",
  "Foods",
  "Vegetables",
  "Meat (Chicken)",
  "Meat (Fish)",
  "Suppliers",
  "Payroll",
  "Rent",
  "Utilities",
  "Other",
];

function normalizeFixedCategory(cat) {
  const c = String(cat || "").trim();
  return FIXED_CATS.includes(c) ? c : "Other";
}

function initFixedCategoryTotals() {
  const obj = {};
  for (const c of FIXED_CATS) obj[c] = { revenue: 0, expense: 0 };
  return obj;
}

/**
 * entries: [{ type:"revenue"|"expense", category, amount, paymentMethod? }]
 */
function computeTotalsFromEntries(entries) {
  const categoryTotals = initFixedCategoryTotals();
  let revenueTotal = 0;
  let expensesTotal = 0;

  for (const e of entries || []) {
    const type = String(e?.type || "").toLowerCase();
    const amt = safeNum(e?.amount);
    const cat = normalizeFixedCategory(e?.category);

    if (type === "revenue") {
      revenueTotal += amt;
      categoryTotals[cat].revenue += amt;
    } else if (type === "expense") {
      expensesTotal += amt;
      categoryTotals[cat].expense += amt;
    }
  }

  return {
    revenueTotal,
    expensesTotal,
    categoryTotals,
    profit: revenueTotal - expensesTotal,
  };
}

export default function Dashboard() {
  const { currency } = usePeriod();
  const { user, loading } = useAuth();

  const [dateKey, setDateKey] = useState(todayKey());
  const [saving, setSaving] = useState(false);


  // ✅ INCOME
  const [cash, setCash] = useState("");
  const [card, setCard] = useState("");
  const [deliveryApps, setDeliveryApps] = useState("");

  // ✅ EXPENSES
  const [drinks, setDrinks] = useState("");
  const [foods, setFoods] = useState("");
  const [vegetables, setVegetables] = useState("");
  const [meatChicken, setMeatChicken] = useState("");
  const [meatFish, setMeatFish] = useState("");

  const [suppliers, setSuppliers] = useState("");
  const [staff, setStaff] = useState(""); // Payroll
  const [rent, setRent] = useState("");
  const [utilities, setUtilities] = useState("");
  const [other, setOther] = useState("");

  // ✅ payment method (expenses)
  const [pmDrinks, setPmDrinks] = useState("cash");
  const [pmFoods, setPmFoods] = useState("cash");
  const [pmVegetables, setPmVegetables] = useState("cash");
  const [pmMeatChicken, setPmMeatChicken] = useState("cash");
  const [pmMeatFish, setPmMeatFish] = useState("cash");

  const [pmSuppliers, setPmSuppliers] = useState("bank");
  const [pmPayroll, setPmPayroll] = useState("bank");
  const [pmRent, setPmRent] = useState("bank");
  const [pmUtilities, setPmUtilities] = useState("bank");
  const [pmOther, setPmOther] = useState("cash");

  const incomeTotal = useMemo(
    () => num(cash) + num(card) + num(deliveryApps),
    [cash, card, deliveryApps]
  );

  const expenseTotal = useMemo(
    () =>
      num(drinks) +
      num(foods) +
      num(vegetables) +
      num(meatChicken) +
      num(meatFish) +
      num(suppliers) +
      num(staff) +
      num(rent) +
      num(utilities) +
      num(other),
    [
      drinks,
      foods,
      vegetables,
      meatChicken,
      meatFish,
      suppliers,
      staff,
      rent,
      utilities,
      other,
    ]
  );

  const net = useMemo(() => incomeTotal - expenseTotal, [incomeTotal, expenseTotal]);

  const dailyExpenseMap = useMemo(
    () => ({
      Drinks: num(drinks),
      Foods: num(foods),
      Vegetables: num(vegetables),
      "Meat (Chicken)": num(meatChicken),
      "Meat (Fish)": num(meatFish),
      Suppliers: num(suppliers),
      Payroll: num(staff),
      Rent: num(rent),
      Utilities: num(utilities),
      Other: num(other),
    }),
    [
      drinks,
      foods,
      vegetables,
      meatChicken,
      meatFish,
      suppliers,
      staff,
      rent,
      utilities,
      other,
    ]
  );

  const dailyInsights = useMemo(
    () =>
      buildInsights({
        revenueTotal: incomeTotal,
        expensesTotal: expenseTotal,
        expensesByCategory: dailyExpenseMap,
        scopeLabel: "Today",
      }),
    [incomeTotal, expenseTotal, dailyExpenseMap]
  );

  // ✅ cores fixas
  const incomeColors = ["#22c55e", "#3b82f6", "#f59e0b"]; // cash, card, delivery

  function clearForm() {
    setCash("");
    setCard("");
    setDeliveryApps("");

    setDrinks("");
    setFoods("");
    setVegetables("");
    setMeatChicken("");
    setMeatFish("");

    setSuppliers("");
    setStaff("");
    setRent("");
    setUtilities("");
    setOther("");
  }

  // ✅ CARREGA/RESTAURA os valores do dia quando muda o dateKey
  useEffect(() => {
    const key = "kobi_daily_reports";
    const arr = JSON.parse(localStorage.getItem(key) || "[]");
    const found = arr.find((r) => r.dateKey === dateKey);

    if (found) {
      setCash(found?.income?.cash ? String(found.income.cash) : "");
      setCard(found?.income?.card ? String(found.income.card) : "");
      setDeliveryApps(found?.income?.deliveryApps ? String(found.income.deliveryApps) : "");

      setDrinks(found?.expenses?.Drinks ? String(found.expenses.Drinks) : "");
      setFoods(found?.expenses?.Foods ? String(found.expenses.Foods) : "");
      setVegetables(found?.expenses?.Vegetables ? String(found.expenses.Vegetables) : "");
      setMeatChicken(
        found?.expenses?.["Meat (Chicken)"] ? String(found.expenses["Meat (Chicken)"]) : ""
      );
      setMeatFish(found?.expenses?.["Meat (Fish)"] ? String(found.expenses["Meat (Fish)"]) : "");

      setSuppliers(found?.expenses?.Suppliers ? String(found.expenses.Suppliers) : "");
      setStaff(found?.expenses?.Payroll ? String(found.expenses.Payroll) : "");
      setRent(found?.expenses?.Rent ? String(found.expenses.Rent) : "");
      setUtilities(found?.expenses?.Utilities ? String(found.expenses.Utilities) : "");
      setOther(found?.expenses?.Other ? String(found.expenses.Other) : "");
    } else {
      // não tem nada salvo pra esse dia → começa limpo
      clearForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  // ✅ NOVO: vira o dia automaticamente à meia-noite (e aí carrega/zera pelo useEffect acima)
  useEffect(() => {
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);

    const ms = nextMidnight.getTime() - now.getTime();
    const t = setTimeout(() => {
      setDateKey(todayKey());
    }, ms);

    return () => clearTimeout(t);
  }, [dateKey]);

  function saveDayLocal() {
    const payload = {
      dateKey,
      income: {
        cash: num(cash),
        card: num(card),
        deliveryApps: num(deliveryApps),
      },
      expenses: {
        Drinks: num(drinks),
        Foods: num(foods),
        Vegetables: num(vegetables),
        "Meat (Chicken)": num(meatChicken),
        "Meat (Fish)": num(meatFish),
        Suppliers: num(suppliers),
        Payroll: num(staff),
        Rent: num(rent),
        Utilities: num(utilities),
        Other: num(other),
      },
      totals: { incomeTotal, expenseTotal, net },
      createdAt: Date.now(),
      brand: BRAND,
    };

    const key = "kobi_daily_reports";
    const prev = JSON.parse(localStorage.getItem(key) || "[]");
    const next = [payload, ...prev.filter((r) => r.dateKey !== dateKey)];
    localStorage.setItem(key, JSON.stringify(next));

    // (Daily boxes são do dia atual, então não precisamos “versionar” aqui)
  }

  // ✅ Daily executive boxes (faz sentido no Daily)
  const revenueDay = incomeTotal;
  const expensesDay = expenseTotal;
  const profitDay = net;
  const marginDay = useMemo(() => {
    if (!revenueDay) return 0;
    return (profitDay / revenueDay) * 100;
  }, [profitDay, revenueDay]);

  // ✅ Donut data (Income)
  const incomePie = useMemo(() => {
    return [
      { label: "Cash", value: num(cash) },
      { label: "Card", value: num(card) },
      { label: "Delivery apps", value: num(deliveryApps) },
    ].filter((x) => x.value > 0);
  }, [cash, card, deliveryApps]);

  const hasIncomePie = useMemo(
    () => incomePie.reduce((s, x) => s + safeNum(x.value), 0) > 0,
    [incomePie]
  );

  async function saveDayExpenses(ownerId) {
    const items = [
      { category: "Drinks", amount: num(drinks), paymentMethod: pmDrinks },
      { category: "Foods", amount: num(foods), paymentMethod: pmFoods },
      { category: "Vegetables", amount: num(vegetables), paymentMethod: pmVegetables },
      { category: "Meat (Chicken)", amount: num(meatChicken), paymentMethod: pmMeatChicken },
      { category: "Meat (Fish)", amount: num(meatFish), paymentMethod: pmMeatFish },
      { category: "Suppliers", amount: num(suppliers), paymentMethod: pmSuppliers },
      { category: "Payroll", amount: num(staff), paymentMethod: pmPayroll },
      { category: "Rent", amount: num(rent), paymentMethod: pmRent },
      { category: "Utilities", amount: num(utilities), paymentMethod: pmUtilities },
      { category: "Other", amount: num(other), paymentMethod: pmOther },
    ].filter((i) => i.amount > 0);

    for (const it of items) {
      await createExpense(RESTAURANT_ID, {
        ownerId,
        restaurantId: RESTAURANT_ID,
        brand: BRAND,

        date: dateKey,
        amount: it.amount,
        category: it.category,
        paymentMethod: it.paymentMethod,
        status: "paid",
      });
    }
  }

  async function saveAll() {
    if (saving) return;
    setSaving(true);

    if (loading) {
      alert("Aguarde… confirmando sessão.");
      setSaving(false);
      return;
    }

    if (!user) {
      alert("Sua sessão não está ativa. Volte ao Login e entre novamente.");
      setSaving(false);
      return;
    }

    const uid = user.uid;

    try {
      const entries = [
        { type: "revenue", category: "Cash", amount: num(cash), paymentMethod: "cash" },
        { type: "revenue", category: "Card", amount: num(card), paymentMethod: "card" },
        { type: "revenue", category: "Delivery apps", amount: num(deliveryApps), paymentMethod: "mixed" },

        { type: "expense", category: "Drinks", amount: num(drinks), paymentMethod: pmDrinks },
        { type: "expense", category: "Foods", amount: num(foods), paymentMethod: pmFoods },
        { type: "expense", category: "Vegetables", amount: num(vegetables), paymentMethod: pmVegetables },
        { type: "expense", category: "Meat (Chicken)", amount: num(meatChicken), paymentMethod: pmMeatChicken },
        { type: "expense", category: "Meat (Fish)", amount: num(meatFish), paymentMethod: pmMeatFish },
        { type: "expense", category: "Suppliers", amount: num(suppliers), paymentMethod: pmSuppliers },
        { type: "expense", category: "Payroll", amount: num(staff), paymentMethod: pmPayroll },
        { type: "expense", category: "Rent", amount: num(rent), paymentMethod: pmRent },
        { type: "expense", category: "Utilities", amount: num(utilities), paymentMethod: pmUtilities },
        { type: "expense", category: "Other", amount: num(other), paymentMethod: pmOther },
      ].filter((e) => safeNum(e.amount) > 0);

      const totals = computeTotalsFromEntries(entries);

      // ✅ local primeiro (para não perder nada na tela)
      saveDayLocal();

      // ✅ firebase
      await saveDayExpenses(uid);

      await upsertDailyReport(RESTAURANT_ID, dateKey, {
        ownerId: uid,
        restaurantId: RESTAURANT_ID,
        brand: BRAND,

        entries,
        totals: {
          revenueTotal: totals.revenueTotal,
          expensesTotal: totals.expensesTotal,
          profitTotal: totals.profit,
          categoryTotals: totals.categoryTotals,
          paymentTotals: {
            revenueCash: num(cash),
            revenueCard: num(card),
            revenueDeliveryApps: num(deliveryApps),
          },
        },
      });

      alert(
        `Saved ✅\n${dateKey}\nRevenue: ${money(totals.revenueTotal, currency)}\nExpenses: ${money(
          totals.expensesTotal,
          currency
        )}\nProfit: ${money(totals.profit, currency)}`
      );

      // ✅ NÃO limpar: fica na tela pro cliente ajustar
      // clearForm();
    } catch (e) {
      console.error("SAVE ERROR:", e);
      alert("Error saving: " + (e?.message || e?.code || "unknown"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dailyPage">
      <div className="dailyTop">
        <div>
          <div className="execGrid">
            <div className="execCard">
              <div className="execLabel">Revenue (this day)</div>
              <div className="execValue good">{money(revenueDay, currency)}</div>
            </div>

            <div className="execCard">
              <div className="execLabel">Expenses (this day)</div>
              <div className="execValue bad">{money(expensesDay, currency)}</div>
            </div>

            <div className="execCard">
              <div className="execLabel">Profit</div>
              <div className={`execValue ${profitDay >= 0 ? "good" : "bad"}`}>
                {money(profitDay, currency)}
              </div>
            </div>

            <div className="execCard">
              <div className="execLabel">Margin</div>
              <div className="execValue">{marginDay.toFixed(1)}%</div>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <InsightsCard
              title="Executive insights"
              subtitle="Fast answers for: where you’re losing money & how to improve"
              losing={dailyInsights.losing}
              improve={dailyInsights.improve}
            />
          </div>

          <div className="dailyTitle">Daily Register</div>

          <div className="dailySub" style={{ opacity: 0.85 }}>
            {BRAND} — cash & expenses{" "}
            <span style={{ marginLeft: 10 }}>
              {loading ? "• checking session…" : user ? `• logged: ${user.email || "ok"}` : "• NOT logged"}
            </span>
          </div>
        </div>

        <div className="dateBox">
          <label>Date</label>
          <input type="date" value={dateKey} onChange={(e) => setDateKey(e.target.value)} />
        </div>
      </div>

      <div className="dailyGrid">
        {/* INCOME */}
        <section className="card">
          <div className="cardHead">
            <div className="cardTitle">Income</div>
            <span className="chip">Cash + Card + Delivery</span>
          </div>

          <div className="fields">
            <Field label="Cash" value={cash} onChange={setCash} />
            <Field label="Card" value={card} onChange={setCard} />
            <Field label="Delivery apps" value={deliveryApps} onChange={setDeliveryApps} />
          </div>

          <div className="incomeDonut">
            {hasIncomePie ? (
              <DonutChart
                title="Income split"
                data={incomePie}
                colors={incomeColors}
                theme="light"
                formatValue={(v) => money(v, currency)}
                currencyText={money(incomeTotal, currency)}
              />
            ) : (
              <div style={{ padding: 12, opacity: 0.75, fontWeight: 900 }}>
                Fill Cash/Card/Delivery to see the chart.
              </div>
            )}
          </div>

          <div className="kpiRow">
            <div className="kpi">
              <div className="kLabel">Total income</div>
              <div className="kValue good">{money(incomeTotal, currency)}</div>
            </div>
          </div>

          <div className="hint" style={{ marginTop: 10, opacity: 0.85 }}>
            Tip: Enter only real income sources here (Cash, Card, Delivery apps).
          </div>
        </section>

        {/* EXPENSES */}
        <section className="card">
          <div className="cardHead">
            <div className="cardTitle">Expenses</div>
            <span className="chip">By category</span>
          </div>

          <div className="fields">
            <FieldWithPayment label="Drinks" value={drinks} onChange={setDrinks} paymentValue={pmDrinks} onPaymentChange={setPmDrinks} />
            <FieldWithPayment label="Foods" value={foods} onChange={setFoods} paymentValue={pmFoods} onPaymentChange={setPmFoods} />
            <FieldWithPayment label="Vegetables" value={vegetables} onChange={setVegetables} paymentValue={pmVegetables} onPaymentChange={setPmVegetables} />
            <FieldWithPayment label="Meat (Chicken)" value={meatChicken} onChange={setMeatChicken} paymentValue={pmMeatChicken} onPaymentChange={setPmMeatChicken} />
            <FieldWithPayment label="Meat (Fish)" value={meatFish} onChange={setMeatFish} paymentValue={pmMeatFish} onPaymentChange={setPmMeatFish} />
            <FieldWithPayment label="Suppliers" value={suppliers} onChange={setSuppliers} paymentValue={pmSuppliers} onPaymentChange={setPmSuppliers} />
            <FieldWithPayment label="Payroll" value={staff} onChange={setStaff} paymentValue={pmPayroll} onPaymentChange={setPmPayroll} />
            <FieldWithPayment label="Rent" value={rent} onChange={setRent} paymentValue={pmRent} onPaymentChange={setPmRent} />
            <FieldWithPayment label="Utilities" value={utilities} onChange={setUtilities} paymentValue={pmUtilities} onPaymentChange={setPmUtilities} />
            <FieldWithPayment label="Other" value={other} onChange={setOther} paymentValue={pmOther} onPaymentChange={setPmOther} />
          </div>

          <div className="kpiRow">
            <div className="kpi">
              <div className="kLabel">Total expenses</div>
              <div className="kValue bad">{money(expenseTotal, currency)}</div>
            </div>
          </div>
        </section>

        {/* NET + ACTIONS */}
        <section className="card full">
          <div className="netRow">
            <div className="kpi">
              <div className="kLabel">Net (income − expenses)</div>
              <div className={`kValue ${net >= 0 ? "good" : "bad"}`}>{money(net, currency)}</div>
            </div>

            <div className="btnRow">
              <button className="btn ghost" onClick={clearForm} disabled={saving}>
                Clear
              </button>
              <button className="btn primary" onClick={saveAll} disabled={saving}>
                {saving ? "Saving..." : "Save day"}
              </button>
            </div>
          </div>

          <div className="hint">
            Tip: type <b>1200</b> or <b>1200.50</b> (comma works too).
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        inputMode="decimal"
      />
    </div>
  );
}

function FieldWithPayment({ label, value, onChange, paymentValue, onPaymentChange }) {
  return (
    <div className="field">
      <label>{label}</label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 160px", gap: 10 }}>
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          inputMode="decimal"
        />
        <select value={paymentValue} onChange={(e) => onPaymentChange(e.target.value)}>
          {PAYMENT_METHODS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
