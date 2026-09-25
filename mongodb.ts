import { MongoClient, Db, ServerApiVersion } from 'mongodb';
import dotenv from 'dotenv';
import dns from 'dns';

dotenv.config({ override: true });

// Setup DNS servers for reliable SRV resolution on Windows and various hosting setups
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Ignore if not supported in the environment
}

let client: MongoClient | null = null;
let db: Db | null = null;
let isConnected = false;
let lastError: string | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;

// All CRM tables that map directly to MongoDB collections
export const CRM_TABLES = [
  'users',
  'leads',
  'orders',
  'invoices',
  'inventory_movements',
  'leaves',
  'expenses',
  'sidebar_messages',
  'invitations',
  'notifications',
  'channel_listings',
  'user_activity_logs',
  'staff_attendance',
  'employee_salary_profiles',
  'salary_slips',
];

/**
 * Normalizes and sanitizes MongoDB URI:
 * 1. Handles placeholder angle brackets: <password> -> password
 * 2. Encodes '@' or other special characters in password
 * 3. Ensures database name is present
 */
export function sanitizeMongoUri(rawUri?: string): string {
  let uri = (rawUri || process.env.MONGODB_URI || '').trim();
  if (!uri) return '';

  // 1. Strip surrounding quotes or stray characters
  uri = uri.replace(/^["']|["']$/g, '');

  // 2. Fix placeholder brackets: e.g. <Pallywear@24> -> Pallywear@24
  if (uri.includes('<') && uri.includes('>')) {
    uri = uri.replace(/<([^>]+)>/g, '$1');
  }

  // 3. Fix unencoded '@' in password:
  // e.g. mongodb+srv://username:pass@word@cluster.mongodb.net
  const srvMatch = uri.match(/^(mongodb(?:\+srv)?:\/\/)([^:]+):(.*)@([^/?#]+)(.*)$/);
  if (srvMatch) {
    const [, protocol, username, rawPassword, host, rest] = srvMatch;
    // URL-encode password if it has unencoded '@' or special chars
    const encodedPassword = encodeURIComponent(decodeURIComponent(rawPassword));
    let pathAndQuery = rest;
    if (!pathAndQuery || pathAndQuery.startsWith('?')) {
      const defaultDb = process.env.MONGODB_DB_NAME || 'crm_pallywearcrm';
      pathAndQuery = `/${defaultDb}${pathAndQuery || '?retryWrites=true&w=majority'}`;
    }
    uri = `${protocol}${username}:${encodedPassword}@${host}${pathAndQuery}`;
  }

  return uri;
}

/**
 * Initialize MongoDB connection
 */
export async function initMongoDB(): Promise<boolean> {
  const uri = sanitizeMongoUri();
  const dbName = process.env.MONGODB_DB_NAME || 'crm_pallywearcrm';

  if (!uri) {
    lastError = 'MONGODB_URI is not configured in .env file.';
    console.warn('[MongoDB] No MONGODB_URI configured. MongoDB sync is paused.');
    return false;
  }

  try {
    console.log('[MongoDB] Connecting to MongoDB Atlas...');
    if (client) {
      try { await client.close(); } catch {}
    }

    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    });

    await client.connect();
    db = client.db(dbName);
    isConnected = true;
    lastError = null;
    console.log(`[MongoDB] Connected successfully to database: "${dbName}"`);

    // Ensure collections and unique indexes for faster dual-query and lookup
    try {
      for (const table of CRM_TABLES) {
        const col = db.collection(table);
        // Create index on 'id' for fast lookups and upserts
        await col.createIndex({ id: 1 });
      }
    } catch (idxErr: any) {
      console.warn('[MongoDB] Index creation notice:', idxErr.message);
    }

    return true;
  } catch (err: any) {
    isConnected = false;
    lastError = err.message || String(err);

    if (lastError?.includes('SSL alert') || lastError?.includes('80')) {
      console.warn(
        '\n[MongoDB Notice] MongoDB connection refused with SSL alert 80.\n' +
        '-> This is MongoDB Atlas IP Access List blocking the connection.\n' +
        '-> To fix: Open MongoDB Atlas -> Network Access -> Add IP Address -> Choose "Allow Access From Anywhere" (0.0.0.0/0) or add your server IP.\n'
      );
    } else {
      console.warn('[MongoDB Notice] Connection attempt failed:', lastError);
    }

    // Schedule auto-reconnect attempt in background every 30 seconds
    if (!reconnectTimer) {
      reconnectTimer = setInterval(async () => {
        if (!isConnected) {
          console.log('[MongoDB] Retrying connection in background...');
          const ok = await initMongoDB();
          if (ok && reconnectTimer) {
            clearInterval(reconnectTimer);
            reconnectTimer = null;
          }
        }
      }, 30000);
    }

    return false;
  }
}

/**
 * Returns the MongoDB Database instance if connected
 */
export function getMongoDb(): Db | null {
  return isConnected && db ? db : null;
}

/**
 * Check if MongoDB is connected and ready
 */
export function isMongoConnected(): boolean {
  return isConnected && db !== null;
}

/**
 * Get MongoDB status for status monitoring endpoints
 */
export async function getMongoStatus(): Promise<{
  connected: boolean;
  database: string;
  error: string | null;
  counts?: Record<string, number>;
}> {
  const dbName = process.env.MONGODB_DB_NAME || 'crm_pallywearcrm';
  if (!isConnected || !db) {
    return {
      connected: false,
      database: dbName,
      error: lastError || 'Disconnected or not initialized',
    };
  }

  try {
    const counts: Record<string, number> = {};
    for (const table of CRM_TABLES) {
      counts[table] = await db.collection(table).countDocuments();
    }
    return {
      connected: true,
      database: dbName,
      error: null,
      counts,
    };
  } catch (err: any) {
    return {
      connected: isConnected,
      database: dbName,
      error: err.message,
    };
  }
}

/**
 * Safely parse JSON strings into objects for Mongo documents if valid
 */
function sanitizeDocForMongo(doc: any): any {
  if (!doc || typeof doc !== 'object') return doc;
  const cleaned: Record<string, any> = { ...doc };

  // Convert MySQL binary/boolean tinyint(1) fields and JSON string fields cleanly
  for (const key of Object.keys(cleaned)) {
    const val = cleaned[key];
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try {
        cleaned[key] = JSON.parse(val);
      } catch {
        // Keep string if not valid JSON
      }
    }
  }

  cleaned._syncedAt = new Date();
  return cleaned;
}

/**
 * Upsert a single record into MongoDB
 */
export async function mongoUpsert(collectionName: string, id: string | number, doc: any): Promise<boolean> {
  const database = getMongoDb();
  if (!database) return false;

  try {
    const formatted = sanitizeDocForMongo(doc);
    formatted.id = id;
    const col = database.collection(collectionName);
    await col.updateOne(
      { id },
      { $set: formatted },
      { upsert: true }
    );
    return true;
  } catch (err: any) {
    console.warn(`[MongoDB Sync] Upsert failed for ${collectionName}/${id}:`, err.message);
    return false;
  }
}

/**
 * Delete a single record from MongoDB
 */
export async function mongoDelete(collectionName: string, id: string | number): Promise<boolean> {
  const database = getMongoDb();
  if (!database) return false;

  try {
    const col = database.collection(collectionName);
    await col.deleteOne({ id });
    return true;
  } catch (err: any) {
    console.warn(`[MongoDB Sync] Delete failed for ${collectionName}/${id}:`, err.message);
    return false;
  }
}

/**
 * Delete multiple records from MongoDB matching a filter
 */
export async function mongoDeleteMany(collectionName: string, filter: any): Promise<boolean> {
  const database = getMongoDb();
  if (!database) return false;

  try {
    const col = database.collection(collectionName);
    await col.deleteMany(filter);
    return true;
  } catch (err: any) {
    console.warn(`[MongoDB Sync] DeleteMany failed for ${collectionName}:`, err.message);
    return false;
  }
}

/**
 * Full Sync: Copy ALL records from cPanel MySQL tables into MongoDB collections
 */
export async function syncAllFromMySQL(queryFn: (sql: string, params?: any[]) => Promise<any>): Promise<{
  success: boolean;
  message: string;
  syncedCounts: Record<string, number>;
}> {
  const database = getMongoDb();
  if (!database) {
    return {
      success: false,
      message: `MongoDB is not connected. ${lastError || ''}`.trim(),
      syncedCounts: {},
    };
  }

  console.log('[MongoDB Sync] Starting full sync from MySQL to MongoDB...');
  const syncedCounts: Record<string, number> = {};

  for (const table of CRM_TABLES) {
    try {
      const rows = await queryFn(`SELECT * FROM \`${table}\``) as any[];
      if (!Array.isArray(rows) || rows.length === 0) {
        syncedCounts[table] = 0;
        continue;
      }

      const col = database.collection(table);
      let count = 0;

      for (const row of rows) {
        const id = row.id ?? row._id;
        const formatted = sanitizeDocForMongo(row);
        if (id !== undefined && id !== null) {
          formatted.id = id;
          await col.updateOne({ id }, { $set: formatted }, { upsert: true });
        } else {
          await col.insertOne(formatted);
        }
        count++;
      }

      syncedCounts[table] = count;
      console.log(`[MongoDB Sync] Synced ${count} records for table: ${table}`);
    } catch (err: any) {
      console.warn(`[MongoDB Sync] Table sync error on "${table}":`, err.message);
      syncedCounts[table] = -1; // Indicates error on this table
    }
  }

  console.log('[MongoDB Sync] Full sync finished!');
  return {
    success: true,
    message: 'Synchronization from cPanel MySQL to MongoDB completed successfully.',
    syncedCounts,
  };
}
