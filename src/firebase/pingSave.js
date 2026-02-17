import { db } from "./firebase"; // ajuste o caminho se seu db estiver em outro arquivo
import { addDoc, collection, serverTimestamp } from "firebase/firestore";

export async function pingSave() {
  const ref = await addDoc(collection(db, "ping"), {
    ok: true,
    createdAt: serverTimestamp(),
  });
  console.log("✅ Salvou no Firestore. Doc:", ref.id);
  return ref.id;
}
