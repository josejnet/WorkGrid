import { loadCol, updDoc, setDocById, delDocCol } from "./db";

export const getUsers = () => loadCol("users");

export async function saveUser(data) {
  const { _fid, ...toSave } = data;
  if (_fid) {
    await updDoc("users", _fid, toSave);
    return { ...toSave, _fid };
  } else {
    const id = await setDocById("users", data.email, toSave);
    return id ? { ...toSave, _fid: data.email } : null;
  }
}

export async function deleteUser(id) {
  return delDocCol("users", id);
}

export async function deactivateUser(id) {
  await updDoc("users", id, { active: false });
}
