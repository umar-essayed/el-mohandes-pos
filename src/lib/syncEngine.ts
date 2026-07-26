import { supabase } from './supabase';
import { localDB } from './db';

// ============================================================
// CASE CONVERSION HELPERS (CAMELCASE JS <-> SNAKE_CASE POSTGRES)
// ============================================================
export function toSnakeCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toSnakeCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const n: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      n[snakeKey] = toSnakeCase(obj[key]);
    }
    return n;
  }
  return obj;
}

export function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj !== null && typeof obj === 'object' && !(obj instanceof Date)) {
    const n: Record<string, any> = {};
    for (const key of Object.keys(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      n[camelKey] = toCamelCase(obj[key]);
    }
    return n;
  }
  return obj;
}

// ============================================================
// SECTION 1: ONLINE STATUS
// ============================================================
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' && navigator.onLine;
};

// ============================================================
// SECTION 2: CONFLICT TYPES FOR ADMIN NOTIFICATIONS
// ============================================================
export interface SyncConflict {
  id: string;
  table: string;
  field: string;
  localValue: number | string;
  remoteValue: number | string;
  resolvedValue: number | string;
  description: string;
  detectedAt: string;
}

let pendingConflicts: SyncConflict[] = [];

export const getAndClearConflicts = (): SyncConflict[] => {
  const copy = [...pendingConflicts];
  pendingConflicts = [];
  return copy;
};

export const hasPendingConflicts = (): boolean => pendingConflicts.length > 0;

// ============================================================
// SECTION 3: SAFE PULL FROM SUPABASE (ONLINE FIRST -> LOCAL CACHE)
// ============================================================
export async function syncTableFromSupabase<T extends { id: string }>(
  tableName: string,
  dexieTable: any
): Promise<T[]> {
  const localItems = await dexieTable.toArray();

  try {
    if (isOnline()) {
      const { data, error } = await supabase.from(tableName).select('*');
      if (!error && data && Array.isArray(data)) {
        if (data.length > 0) {
          const camelData = toCamelCase(data);
          await dexieTable.clear();
          await dexieTable.bulkPut(camelData);
          return camelData as T[];
        } else if (localItems.length > 0) {
          console.log(`[SyncEngine] Supabase '${tableName}' empty. Uploading ${localItems.length} local records...`);
          const snakeLocalItems = toSnakeCase(localItems);
          const { error: insertErr } = await supabase.from(tableName).insert(snakeLocalItems);
          if (insertErr) {
            console.error(`[SyncEngine] Upload error for ${tableName}:`, insertErr);
          }
          return localItems as T[];
        }
      } else if (error) {
        console.error(`[SyncEngine] Select error for ${tableName}:`, error);
      }
    }
  } catch (err) {
    console.warn(`[SyncEngine] Pull error for ${tableName}, keeping local DB:`, err);
  }

  return localItems as T[];
}

// ============================================================
// SECTION 4: SAFE PUSH TO SUPABASE (ONLINE -> IMMEDIATE, OFFLINE -> QUEUE)
// ============================================================
export async function syncPushToSupabase(
  tableName: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  data: any
): Promise<boolean> {
  try {
    if (isOnline()) {
      const snakeData = toSnakeCase(data);
      if (action === 'INSERT') {
        const { error } = await supabase.from(tableName).insert([snakeData]);
        if (!error) {
          console.log(`[SyncEngine] ✅ Successfully pushed INSERT to Supabase table '${tableName}'`);
          return true;
        }
        console.error(`[SyncEngine] Insert error on ${tableName}:`, error);
      } else if (action === 'UPDATE') {
        const { error } = await supabase.from(tableName).update(snakeData).eq('id', data.id);
        if (!error) {
          console.log(`[SyncEngine] ✅ Successfully pushed UPDATE to Supabase table '${tableName}'`);
          return true;
        }
        console.error(`[SyncEngine] Update error on ${tableName}:`, error);
      } else if (action === 'DELETE') {
        const { error } = await supabase.from(tableName).delete().eq('id', data.id);
        if (!error) {
          console.log(`[SyncEngine] ✅ Successfully pushed DELETE to Supabase table '${tableName}'`);
          return true;
        }
        console.error(`[SyncEngine] Delete error on ${tableName}:`, error);
      }
    }
  } catch (err) {
    console.warn(`[SyncEngine] Push failed for ${tableName}, queuing offline:`, err);
  }

  // If offline or push errored, queue in Dexie pending sync table
  await localDB.pendingSync.add({
    table: tableName,
    action,
    data,
    createdAt: new Date().toISOString()
  });

  return false;
}

// ============================================================
// SECTION 5: OFFLINE QUEUE PROCESSOR WITH CONFLICT DETECTION
// ============================================================
export async function processPendingOfflineSync(): Promise<{ synced: number; conflicts: SyncConflict[] }> {
  if (!isOnline()) return { synced: 0, conflicts: [] };

  const pendingList = await localDB.pendingSync.toArray();
  if (pendingList.length === 0) return { synced: 0, conflicts: [] };

  console.log(`[SyncEngine] Processing ${pendingList.length} offline queued operations...`);

  const conflicts: SyncConflict[] = [];
  let syncedCount = 0;

  for (const item of pendingList) {
    try {
      const snakeData = toSnakeCase(item.data);

      if (item.action === 'INSERT') {
        const { data: existing } = await supabase.from(item.table).select('id').eq('id', item.data.id).single();
        if (existing) {
          if (item.id) await localDB.pendingSync.delete(item.id);
          syncedCount++;
          continue;
        }
        const { error } = await supabase.from(item.table).insert([snakeData]);
        if (error) {
          console.error(`[SyncEngine] Failed queued insert into ${item.table}:`, error);
          continue;
        }
      } else if (item.action === 'UPDATE') {
        const { data: remoteRaw } = await supabase.from(item.table).select('*').eq('id', item.data.id).single();

        if (remoteRaw) {
          const remoteRecord = toCamelCase(remoteRaw);
          const inventoryConflictFields = ['stockQuantity', 'currentBalance'];

          for (const field of inventoryConflictFields) {
            if (
              field in item.data &&
              field in remoteRecord &&
              remoteRecord[field] !== undefined
            ) {
              const localVal = item.data[field] as number;
              const remoteVal = remoteRecord[field] as number;

              if (Math.abs(localVal - remoteVal) > 0) {
                const resolvedVal = Math.min(localVal, remoteVal);

                const conflict: SyncConflict = {
                  id: `${item.table}-${item.data.id}-${field}-${Date.now()}`,
                  table: item.table,
                  field,
                  localValue: localVal,
                  remoteValue: remoteVal,
                  resolvedValue: resolvedVal,
                  description: getConflictDescription(item.table, field, item.data, localVal, remoteVal, resolvedVal),
                  detectedAt: new Date().toLocaleString('ar-EG')
                };

                conflicts.push(conflict);
                pendingConflicts.push(conflict);
                item.data[field] = resolvedVal;
              }
            }
          }

          const updatedSnakeData = toSnakeCase(item.data);
          const { error } = await supabase.from(item.table).update(updatedSnakeData).eq('id', item.data.id);
          if (error) {
            console.error(`[SyncEngine] Failed queued update for ${item.table}:`, error);
            continue;
          }
        } else {
          const { error } = await supabase.from(item.table).insert([snakeData]);
          if (error) {
            console.error(`[SyncEngine] Failed queued re-insert for ${item.table}:`, error);
            continue;
          }
        }

      } else if (item.action === 'DELETE') {
        const { error } = await supabase.from(item.table).delete().eq('id', item.data.id);
        if (error) {
          console.error(`[SyncEngine] Failed queued delete for ${item.table}:`, error);
          continue;
        }
      }

      if (item.id) await localDB.pendingSync.delete(item.id);
      syncedCount++;

    } catch (err) {
      console.error(`[SyncEngine] Error processing queued item #${item.id} for ${item.table}:`, err);
    }
  }

  console.log(`[SyncEngine] ✅ Synced ${syncedCount} items. Conflicts: ${conflicts.length}`);
  return { synced: syncedCount, conflicts };
}

// ============================================================
// SECTION 6: CONFLICT DESCRIPTION HELPER (ARABIC)
// ============================================================
function getConflictDescription(
  table: string,
  field: string,
  data: any,
  localVal: number,
  remoteVal: number,
  resolvedVal: number
): string {
  const tableAr: Record<string, string> = {
    inventory: 'المخزون (الإكسسوارات)',
    phones: 'التلفونات',
    wallets: 'المحافظ الرقمية',
    wallet_transactions: 'معاملات المحافظ'
  };

  const fieldAr: Record<string, string> = {
    stockQuantity: 'كمية المخزون',
    currentBalance: 'رصيد المحفظة'
  };

  const itemName = data.name || data.model || data.phoneNumber || data.id;
  const tableName = tableAr[table] || table;
  const fieldName = fieldAr[field] || field;

  return `⚠️ ${tableName} - "${itemName}": تعارض في "${fieldName}" → الجهاز أوفلاين سجّل (${localVal}) والخادم عنده (${remoteVal})، تم الحل بأخذ الأقل (${resolvedVal}) لضمان دقة المخزون`;
}

// ============================================================
// SECTION 7: PENDING COUNT GETTER (FOR UI BADGE)
// ============================================================
export async function getPendingSyncCount(): Promise<number> {
  try {
    return await localDB.pendingSync.count();
  } catch {
    return 0;
  }
}

// ============================================================
// SECTION 8: AUTO-SYNC ON RECONNECT (GLOBAL EVENT LISTENER)
// ============================================================
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[SyncEngine] 🌐 Back online! Processing offline queue...');
    await processPendingOfflineSync();
  });

  window.addEventListener('offline', () => {
    console.log('[SyncEngine] 📴 Gone offline. Operations will be queued locally.');
  });
}
