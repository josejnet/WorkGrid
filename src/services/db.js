import { db } from "../firebase";
import {
  collection, getDocs, doc, addDoc, updateDoc, setDoc, deleteDoc,
} from "firebase/firestore";

const col = (n)    => collection(db, n);
const ref = (c, i) => doc(db, c, i);

export async function loadCol(name) {
  try {
    const s = await getDocs(col(name));
    return s.docs.map(d => ({ _fid: d.id, ...d.data() }));
  } catch (e) {
    console.error(`[db] loadCol(${name}):`, e);
    return [];
  }
}

export async function addDocCol(colName, data) {
  try {
    const r = await addDoc(col(colName), data);
    return r.id;
  } catch (e) {
    console.error(`[db] addDocCol(${colName}):`, e);
    return null;
  }
}

// Throws on failure so callers can detect and handle write errors.
export async function updDoc(colName, id, data) {
  try {
    await updateDoc(ref(colName, id), data);
  } catch (e) {
    console.error(`[db] updDoc(${colName}/${id}):`, e);
    throw e; // re-throw — silent swallow masks permission failures
  }
}

export async function setDocById(colName, id, data) {
  try {
    await setDoc(ref(colName, id), data);
    return id;
  } catch (e) {
    console.error(`[db] setDocById(${colName}/${id}):`, e);
    return null;
  }
}

export async function delDocCol(colName, id) {
  try {
    await deleteDoc(ref(colName, id));
    return true;
  } catch (e) {
    console.error(`[db] delDocCol(${colName}/${id}):`, e);
    return false;
  }
}
