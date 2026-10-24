// Back up and restore trip cards as a file, and ask the browser to keep our storage.
//
// Note: no web app can survive the user choosing "Clear browsing data" — that erases
// everything sites have stored. A backup file (e.g. in Downloads) is what survives it.
import { getCards, getMeta, setMeta, importCards } from './store.js';

const FORMAT = 'travel-advisor-backup';

function backupBlob() {
  const data = { format: FORMAT, version: 1, exportedAt: new Date().toISOString(), cards: getCards() };
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

/** Read a backup file and merge its trips. Returns { added, updated, skipped }. */
export async function restoreFrom(file) {
  if (file.size > 5 * 1024 * 1024) throw new Error('That file is too large to be a Travel Advisor backup');
  let data;
  try {
    data = JSON.parse(await file.text());
  } catch {
    throw new Error('That file isn’t a Travel Advisor backup (it couldn’t be read)');
  }
  const list = Array.isArray(data) ? data : data?.format === FORMAT ? data.cards : null;
  if (!Array.isArray(list)) throw new Error('That file isn’t a Travel Advisor backup');
  const result = importCards(list);
  if (!result.added && !result.updated) throw new Error('No trips found in that file');
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

/** True when there are trips changed since the last backup. */
export function needsBackup() {
  const { lastChange = 0, lastBackup = 0 } = getMeta();
  return getCards().length > 0 && lastChange > lastBackup;
}

export function lastBackupText() {
  const { lastBackup } = getMeta();
  if (!lastBackup) return 'Not backed up yet.';
  return `Last backup: ${new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(lastBackup)}.`;
}
