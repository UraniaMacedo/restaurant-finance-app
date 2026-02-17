import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

function toISODateString(v) {
  if (!v) return "";
  if (v instanceof Date) {
    const yyyy = v.getFullYear();
    const mm = String(v.getMonth() + 1).padStart(2, "0");
    const dd = String(v.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  return String(v).slice(0, 10); // YYYY-MM-DD
}

// ✅ Salva em: restaurants/{restaurantId}/dailyReports/{dateKey}
export async function upsertDailyReport(restaurantId, dateKey, data) {
  if (!restaurantId) throw new Error("restaurantId is required");
  if (!dateKey) throw new Error("dateKey is required");

  const key = toISODateString(dateKey);
  if (!key) throw new Error("dateKey must be YYYY-MM-DD");

  const ref = doc(db, "restaurants", restaurantId, "dailyReports", key);

  await setDoc(
    ref,
    {
      ...(data || {}),
      restaurantId,
      date: key,
      dateKey: key,

      // ✅ createdAt: só grava na 1ª vez
      createdAt: data?.createdAt ?? serverTimestamp(),

      // ✅ updatedAt: sempre atualiza
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

// ✅ Lista por intervalo dentro do restaurante
export async function listDailyReportsByRange(restaurantId, startDate, endDate) {
  if (!restaurantId) throw new Error("restaurantId is required");

  const start = toISODateString(startDate);
  const end = toISODateString(endDate);
  if (!start || !end) return [];

  const ref = collection(db, "restaurants", restaurantId, "dailyReports");

  try {
    const q1 = query(
      ref,
      where("date", ">=", start),
      where("date", "<=", end),
      orderBy("date", "asc")
    );

    const snap = await getDocs(q1);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.warn("listDailyReportsByRange fallback (no index?)", e?.code, e?.message);

    const q2 = query(ref, where("date", ">=", start), where("date", "<=", end));
    const snap = await getDocs(q2);

    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));
  }
}
