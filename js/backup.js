// Back up and restore trip cards as a file, and ask the browser to keep our storage.
//
// Note: no web app can survive the user choosing "Clear browsing data" — that erases
// everything sites have stored. A backup file (e.g. in Downloads) is what survives it.
import { getCards, getMeta, setMeta, importCards } from './store.js';
import { getProfile, saveProfile, cleanProfile } from './profile.js';
import { t, stamp } from './i18n.js';

const FORMAT = 'travel-advisor-backup';

function backupBlob() {
  const data = { format: FORMAT, version: 2, exportedAt: new Date().toISOString(), cards: getCards(), profile: getProfile() };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

function fileName() {
  return `travel-advisor-backup-${new Date().toISOString().slice(0, 10)}.json`;
}

/** Save the backup file to the device (Downloads on Android, Files on iPhone). */
export function downloadBackup() {
  const url = URL.createObjectURL(backupBlob());
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName();
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  setMeta({ lastBackup: Date.now() });
}

/** Read a backup file and merge its trips (and profile). Returns { added, updated, skipped, profile }. */
export async function restoreFrom(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error(t('backup.tooLarge'));
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error(t('backup.unreadable'));
  }
  const list = Array.isArray(data) ? data : data?.format === FORMAT ? data.cards : null;
  if (!Array.isArray(list)) throw new Error(t('backup.notBackup'));
  const result = list.length ? importCards(list) : { added: 0, updated: 0, skipped: 0 };
  // Backups from version 2 on also carry the profile.
  const profile = !Array.isArray(data) && data.profile ? cleanProfile(data.profile) : null;
  result.profile = !!(profile && Object.keys(profile).length);
  if (result.profile) saveProfile(profile);
  if (!result.added && !result.updated && !result.profile) throw new Error(t('backup.noTrips'));
  return result;
}

/** Ask the browser not to delete our storage when the device runs low on space. */
export async function requestPersistence() {
  try {
    if (!navigator.storage?.persist) return 'unsupported';
    if (await navigator.storage.persisted()) return 'granted';
    return (await navigator.storage.persist()) ? 'granted' : 'denied';
  } catch {
    return 'unsupported';
  }
}

/** True when there are trips (or a profile) changed since the last backup. */
export function needsBackup() {
  const { lastChange = 0, lastBackup = 0 } = getMeta();
  const p = getProfile();
  return (getCards().length > 0 || !!(p.name || p.home)) && lastChange > lastBackup;
}

export function lastBackupText() {
  const { lastBackup } = getMeta();
  return lastBackup ? t('backup.last', { date: stamp(lastBackup) }) : t('backup.notYet');
}
