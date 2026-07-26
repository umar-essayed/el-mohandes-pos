import { supabase } from './supabase';
import { localDB } from './db';

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

// In-memory store for conflicts detected during sync (shown to admin on login)
let pendingConflicts: SyncConflict[] = [];

export const getAndClearConflicts = (): SyncConflict[] => {
  const copy = [...pendingConflicts];
  pendingConflicts = [];
  return copy;
};

export const hasPendingConflicts = (): boolean => pendingConflicts.length > 0;

// ============================================================
// SECTION 3: SAFE PULL FROM SUPABASE (NEVER WIPE LOCAL IF SUPABASE EMPTY)
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
          // Supabase has records → sync into local
          await dexieTable.clear();
          await dexieTable.bulkPut(data);
          return data as T[];
        } else if (localItems.length > 0) {
          // Supabase empty but local has data → upload local to Supabase
          console.log(`[SyncEngine] Supabase '${tableName}' empty. Uploading ${localItems.length} local records...`);
          await supabase.from(tableName).insert(localItems);
          return localItems as T[];
        }
      }
    }
  } catch (err) {
    console.warn(`[SyncEngine] Pull error for ${tableName}, keeping local DB:`, err);
  }

  return localItems as T[];
}

// ============================================================
// SECTION 4: SAFE PUSH TO SUPABASE (QUEUE WHEN OFFLINE)
// ============================================================
export async function syncPushToSupabase(
  tableName: string,
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  data: any
): Promise<boolean> {
  try {
    if (isOnline()) {
      if (action === 'INSERT') {
        const { error } = await supabase.from(tableName).insert([data]);
        if (!error) return true;
      } else if (action === 'UPDATE') {
        const { error } = await supabase.from(tableName).update(data).eq('id', data.id);
        if (!error) return true;
      } else if (action === 'DELETE') {
        const { error } = await supabase.from(tableName).delete().eq('id', data.id);
        if (!error) return true;
      }
    }
  } catch (err) {
    console.warn(`[SyncEngine] Push failed for ${tableName}, queuing offline:`, err);
  }

  // Offline → queue in Dexie pending sync table
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
      if (item.action === 'INSERT') {
        // Check if already exists (another device may have inserted same-id record)
        const { data: existing } = await supabase.from(item.table).select('id').eq('id', item.data.id).single();
        if (existing) {
          // Already there (duplicate offline insert), skip
          if (item.id) await localDB.pendingSync.delete(item.id);
          syncedCount++;
          continue;
        }
        await supabase.from(item.table).insert([item.data]);

      } else if (item.action === 'UPDATE') {
        // CONFLICT DETECTION: compare critical numeric fields with remote
        const { data: remoteRecord } = await supabase.from(item.table).select('*').eq('id', item.data.id).single();

        if (remoteRecord) {
          const inventoryConflictFields = ['stockQuantity', 'currentBalance'];

          for (const field of inventoryConflictFields) {
            if (
              field in item.data &&
              field in remoteRecord &&
              remoteRecord[field] !== undefined
            ) {
              const localVal = item.data[field] as number;
              const remoteVal = remoteRecord[field] as number;

              // If both sides changed (remote was modified by another device offline too)
              if (Math.abs(localVal - remoteVal) > 0) {
                // Resolution strategy: take the LOWER value (conservative - prevents phantom stock)
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

          await supabase.from(item.table).update(item.data).eq('id', item.data.id);
        } else {
          // Remote record deleted, re-insert
          await supabase.from(item.table).insert([item.data]);
        }

      } else if (item.action === 'DELETE') {
        await supabase.from(item.table).delete().eq('id', item.data.id);
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
