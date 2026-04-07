import { db } from "../firebase";
import {
  collection, addDoc, query, where, limit,
  updateDoc, doc, writeBatch, onSnapshot,
} from "firebase/firestore";

const COL = "taller_notificaciones";

export async function createNotification(data) {
  try {
    await addDoc(collection(db, COL), {
      userId:         data.userId,
      taskFid:        data.taskFid        ?? null,
      taskShortId:    data.taskShortId    ?? null,
      taskTitle:      data.taskTitle      ?? null,
      projectId:      data.projectId      ?? null,
      projectName:    data.projectName    ?? null,
      assignedBy:     data.assignedBy     ?? null,
      assignedByName: data.assignedByName ?? null,
      read:           false,
      createdAt:      new Date().toISOString(),
    });
  } catch (e) {
    console.error("createNotification:", e);
  }
}

export async function markNotificationRead(notifId) {
  try {
    await updateDoc(doc(db, COL, notifId), { read: true });
  } catch (e) {
    console.error("markNotificationRead:", e);
  }
}

/** Mark a list of notification IDs as read (pass unread _fid array from client state) */
export async function markAllNotificationsRead(notifIds) {
  if (!notifIds.length) return;
  try {
    const batch = writeBatch(db);
    for (const id of notifIds) {
      batch.update(doc(db, COL, id), { read: true });
    }
    await batch.commit();
  } catch (e) {
    console.error("markAllNotificationsRead:", e);
  }
}

/** Real-time listener for a user's notifications (latest 50, sorted client-side) */
export function subscribeToNotifications(userEmail, callback) {
  const q = query(collection(db, COL), where("userId", "==", userEmail), limit(50));
  return onSnapshot(
    q,
    snap => {
      const notifs = snap.docs
        .map(d => ({ _fid: d.id, ...d.data() }))
        .sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      callback(notifs);
    },
    e => console.error("subscribeToNotifications:", e)
  );
}
