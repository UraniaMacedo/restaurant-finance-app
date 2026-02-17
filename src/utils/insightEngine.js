// Simple, explainable "insights" engine.
// Goal: help answer:
// 2) Where am I losing money?
// 3) How can I improve?

function safeNum(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function pct(part, total) {
  const t = Math.max(0, safeNum(total));
  if (!t) return 0;
  return (safeNum(part) / t) * 100;
}

function topN(map, n = 3) {
  const arr = Object.entries(map || {})
    .map(([k, v]) => [k, safeNum(v)])
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  return arr.slice(0, n);
}

/**
 * Build insights for a time scope.
 *
 * @param {object} input
 * @param {number} input.revenueTotal
 * @param {number} input.expensesTotal
 * @param {Record<string, number>} input.expensesByCategory
 * @param {string} input.scopeLabel - e.g. "Today", "This week".
 */
export function buildInsights({
  revenueTotal = 0,
  expensesTotal = 0,
  expensesByCategory = {},
  scopeLabel = "This period",
}) {
  const revenue = safeNum(revenueTotal);
  const expenses = safeNum(expensesTotal);
  const profit = revenue - expenses;

  const tops = topN(expensesByCategory, 3);

  // 2) Where you are losing money
  const losing = [];
  if (expenses <= 0) {
    losing.push(`No expenses recorded for ${scopeLabel.toLowerCase()}.`);
  } else if (tops.length) {
    for (const [cat, val] of tops) {
      const share = pct(val, expenses);
      const revShare = revenue ? pct(val, revenue) : null;
      losing.push(
        revShare !== null
          ? `${cat}: ${share.toFixed(0)}% of expenses (${revShare.toFixed(0)}% of revenue).`
          : `${cat}: ${share.toFixed(0)}% of expenses.`
      );
    }
  } else {
    losing.push(`Expenses exist, but no categories were detected.`);
  }

  if (revenue > 0) {
    if (profit < 0)
      losing.unshift(
        `Profit is negative for ${scopeLabel.toLowerCase()} (${Math.abs(pct(profit, revenue)).toFixed(
          0
        )}% below break‑even).`
      );
    else if (profit === 0)
      losing.unshift(`You broke even for ${scopeLabel.toLowerCase()} (profit = 0).`);
    else losing.unshift(`Profit is positive for ${scopeLabel.toLowerCase()} (margin ${pct(profit, revenue).toFixed(1)}%).`);
  }

  // 3) How to improve
  const improve = [];

  // Heuristics (restaurant common ranges). Keep it conservative & explainable.
  const payroll = safeNum(expensesByCategory["Payroll"]);
  const rent = safeNum(expensesByCategory["Rent"]);
  const utilities = safeNum(expensesByCategory["Utilities"]);
  const suppliers = safeNum(expensesByCategory["Suppliers"]);
  const foods = safeNum(expensesByCategory["Foods"]);
  const veg = safeNum(expensesByCategory["Vegetables"]);
  const meatC = safeNum(expensesByCategory["Meat (Chicken)"]);
  const meatF = safeNum(expensesByCategory["Meat (Fish)"]);
  const other = safeNum(expensesByCategory["Other"]);

  const foodCost = foods + veg + meatC + meatF;

  if (revenue > 0) {
    const payrollPct = pct(payroll, revenue);
    const rentPct = pct(rent, revenue);
    const foodPct = pct(foodCost, revenue);

    if (foodPct > 35) {
      improve.push(
        `Food cost looks high (${foodPct.toFixed(
          0
        )}% of revenue). Consider portion control, waste tracking, and renegotiating supplier prices.`
      );
    } else {
      improve.push(
        `Keep food cost under control by tracking waste and reviewing your top-selling items' margins weekly.`
      );
    }

    if (payrollPct > 30) {
      improve.push(
        `Payroll is heavy (${payrollPct.toFixed(
          0
        )}% of revenue). Review staffing by shift (busy vs quiet hours) and reduce overtime leaks.`
      );
    }

    if (rentPct > 15) {
      improve.push(
        `Rent is high (${rentPct.toFixed(
          0
        )}% of revenue). If this is consistent, raise prices on best sellers or grow delivery/volume to dilute fixed costs.`
      );
    }
  } else {
    improve.push(`Add revenue (Cash/Card/Delivery) to unlock margin-based recommendations.`);
  }

  // Expense-only tips (works even without revenue)
  if (suppliers > 0) {
    improve.push(
      `Suppliers spend is significant. Create a monthly "top suppliers" list and renegotiate the top 2.`
    );
  }
  if (utilities > 0 && pct(utilities, Math.max(1, expenses)) > 8) {
    improve.push(
      `Utilities are above typical. Check peak-hour usage, fridge/freezer seals, and standby equipment.`
    );
  }
  if (other > 0 && pct(other, Math.max(1, expenses)) > 10) {
    improve.push(`"Other" is large. Categorize these costs to find hidden recurring leaks.`);
  }

  // Always end with an actionable focus
  if (tops.length) {
    const [cat] = tops[0];
    improve.push(`Action for next ${scopeLabel.toLowerCase()}: focus on "${cat}" and try a 5–10% reduction.`);
  }

  return { losing, improve };
}
