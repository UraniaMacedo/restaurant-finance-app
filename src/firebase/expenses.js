import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

// Ajuste os nomes dos campos conforme seu projeto: restaurantId, date, createdAt
export async function listExpensesByDay(restaurantId, dateKey) {
  if (!restaurantId) throw new Error("restaurantId is required");
  if (!dateKey) throw new Error("dateKey is required");

  // ✅ consistente com createExpense/listExpensesByDateRange
  const ref = collection(db, "restaurants", restaurantId, "expenses");
  const day = toISODateString(dateKey);

  // ✅ tenta com orderBy (melhor). Se faltar índice, faz fallback sem orderBy.
  try {
    const q1 = query(ref, where("date", "==", day), orderBy("createdAt", "desc"));
    const snap = await getDocs(q1);
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), type: "expense" }));
  } catch (e) {
    console.warn("listExpensesByDay fallback (no index?)", e?.code, e?.message);

    const q2 = query(ref, where("date", "==", day));
    const snap = await getDocs(q2);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data(), type: "expense" }))
      .sort((a, b) =>
        String(b.createdAtISO || b.date || "").localeCompare(String(a.createdAtISO || a.date || ""))
      );
  }
}

function toISODateString(v) {
  if (!v) return "";
  // aceita Date, "YYYY-MM-DD", timestamps etc (best effort)
  if (v instanceof Date) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(v).slice(0, 10); // "YYYY-MM-DD"
}

function safeNumber(v) {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function createExpense(restaurantId, data) {
  if (!restaurantId) throw new Error("restaurantId is required");

  const ref = collection(db, "restaurants", restaurantId, "expenses");

  const payload = {
    // ✅ seu app usa "date" (YYYY-MM-DD)
    date: toISODateString(data?.date),
    amount: safeNumber(data?.amount),

    supplier: data?.supplier || "",
    category: data?.category || "",
    paymentMethod: data?.paymentMethod || "cash",
    status: data?.status || "paid",

    dueDate: data?.dueDate ? toISODateString(data.dueDate) : null,
    notes: data?.notes || "",

    createdAt: serverTimestamp(),

    // extras (opcionais)
    ownerId: data?.ownerId || null,
    restaurantId: data?.restaurantId || restaurantId,
    brand: data?.brand || "",
    createdBy: data?.createdBy || null,
  };

  if (!payload.date) {
    throw new Error("createExpense: 'date' is required (YYYY-MM-DD)");
  }

  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

export async function listExpensesByDateRange(restaurantId, startDate, endDate) {
  if (!restaurantId) return [];

  const start = toISODateString(startDate);
  const end = toISODateString(endDate);
  if (!start || !end) return [];

  const ref = collection(db, "restaurants", restaurantId, "expenses");

  // ✅ tenta com orderBy (melhor). Se faltar índice, faz fallback sem orderBy.
  try {
    const q1 = query(
      ref,
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date", "desc")
    );
    const snap = await getDocs(q1);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("listExpensesByDateRange fallback (no index?)", e?.code, e?.message);

    const q2 = query(ref, where("date", ">=", start), where("date", "<=", end));
    const snap = await getDocs(q2);

    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }
}

export async function updateExpense(restaurantId, expenseId, data) {
  if (!restaurantId) throw new Error("restaurantId is required");
  if (!expenseId) throw new Error("expenseId is required");

  const ref = doc(db, "restaurants", restaurantId, "expenses", expenseId);

  const patch = { ...(data || {}) };
  if (patch.date) patch.date = toISODateString(patch.date);
  if (patch.dueDate) patch.dueDate = toISODateString(patch.dueDate);

  await updateDoc(ref, patch);
}

export async function deleteExpense(restaurantId, expenseId) {
  if (!restaurantId) throw new Error("restaurantId is required");
  if (!expenseId) throw new Error("expenseId is required");

  const ref = doc(db, "restaurants", restaurantId, "expenses", expenseId);
  await deleteDoc(ref);
}
