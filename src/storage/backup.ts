import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { hydrateStore, serializeStore, type Store } from '../stats/stats';
import { onDevice } from '../platform/native';

export const BACKUP_APP = 'blackjack-trainer';
export const BACKUP_VERSION = 1;

/** Everything the user created (rules, settings, stats). Purchases are never included: they come from the App Store. */
export function buildBackup(store: Store, now = new Date()): string {
  return JSON.stringify({ app: BACKUP_APP, backupVersion: BACKUP_VERSION, exportedAt: now.toISOString(), store: JSON.parse(serializeStore(store)) }, null, 2);
}

export function parseBackup(text: string): Store {
  let o: any;
  try { o = JSON.parse(text); } catch { throw new Error('That file isn’t a valid backup (not JSON).'); }
  if (!o || o.app !== BACKUP_APP || typeof o.store !== 'object' || o.store === null) throw new Error('That file isn’t a Blackjack Trainer backup.');
  if (typeof o.backupVersion === 'number' && o.backupVersion > BACKUP_VERSION) throw new Error('This backup was made by a newer version of the app. Update the app and try again.');
  return hydrateStore(o.store);
}

export const backupFileName = (now = new Date()) => `blackjack-trainer-backup-${now.toISOString().slice(0, 10)}.json`;

/** iOS: write to the cache folder and open the share sheet (Save to Files, AirDrop, Mail…). Web: download the file. */
export async function exportBackup(store: Store): Promise<'shared' | 'downloaded'> {
  const text = buildBackup(store);
  const name = backupFileName();
  if (onDevice()) {
    await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    const { uri } = await Filesystem.getUri({ path: name, directory: Directory.Cache });
    await Share.share({ title: 'Blackjack Trainer backup', url: uri, dialogTitle: 'Save your backup' });
    return 'shared';
  }
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return 'downloaded';
}
