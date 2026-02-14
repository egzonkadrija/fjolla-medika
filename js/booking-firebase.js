import { db } from "./firebase-config.js";
import {
  collection, query, where, onSnapshot, doc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

/**
 * Subscribe to real-time slot status for a given date.
 * @param {string} dateStr  YYYY-MM-DD
 * @param {function} callback  receives Map<time, status>
 * @returns {function} unsubscribe
 */
export function subscribeToDateSlots(dateStr, callback) {
  const q = query(collection(db, "appointments"), where("date", "==", dateStr));
  return onSnapshot(q, (snapshot) => {
    const slots = new Map();
    snapshot.forEach((d) => {
      const data = d.data();
      // Only show pending or accepted — rejected slots become available again
      if (data.status === "pending" || data.status === "accepted") {
        slots.set(data.time, data.status);
      }
    });
    callback(slots);
  });
}

/**
 * Submit a new appointment with status "pending".
 * Uses deterministic doc ID to prevent double-booking race conditions.
 */
export async function submitAppointment(dateStr, time, name, phone, reason) {
  const docId = `${dateStr}_${time}`;
  await setDoc(doc(db, "appointments", docId), {
    date: dateStr,
    time,
    name,
    phone,
    reason: reason || "",
    status: "pending",
    createdAt: serverTimestamp()
  });
}
