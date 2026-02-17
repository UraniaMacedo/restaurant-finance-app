import { db } from "./firebase";
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

export async function createExpense(restaurantId, data) {
  if (!restaurantId) throw new Error("restaurantId is required");

  const ref = collection(db, "restaurants", restaurantId, "expenses");

  const payload = {
    date: data.date, // YYYY-MM-DD
    amount: Number(data.amount || 0),
    supplier: data.supplier || "",
    category: data.category || "",
    paymentMethod: data.paymentMethod || "cash",
    status: data.status || "paid",
    dueDate: data.dueDate || null,
    notes: data.notes || "",
    createdAt: serverTimestamp(),
    createdBy: data.createdBy || null,
  };

  const docRef = await addDoc(ref, payload);
  return docRef.id;
}

export async function listExpensesByDateRange(restaurantId, startDate, endDate) {
  if (!restaurantId) return [];

  const ref = collection(db, "restaurants", restaurantId, "expenses");

  const q = query(
    ref,
    where("date", ">=", startDate),
    where("date", "<=", endDate),
    orderBy("date", "desc")
  );

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function updateExpense(restaurantId, expenseId, data) {
  const ref = doc(db, "restaurants", restaurantId, "expenses", expenseId);
  await updateDoc(ref, data);
}

export async function deleteExpense(restaurantId, expenseId) {
  const ref = doc(db, "restaurants", restaurantId, "expenses", expenseId);
  await deleteDoc(ref);
}
