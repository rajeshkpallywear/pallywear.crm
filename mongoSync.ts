import { pool } from './db';
import {
  mongoUpsert,
  mongoDelete,
  mongoDeleteMany,
  isMongoConnected,
  CRM_TABLES
} from './mongodb';

/**
 * Parses SQL write queries and synchronizes the change to MongoDB.
 * Executed non-blockingly (asynchronously) so MySQL query returns immediately.
 */
export async function syncSqlWriteToMongo(sql: string, params?: any[], resultRows?: any): Promise<void> {
  // If MongoDB is not connected, skip sync
  if (!isMongoConnected()) return;

  const trimmed = sql.trim();
  const writeMatch = trimmed.match(/^(INSERT\s+INTO|UPDATE|DELETE\s+FROM|REPLACE\s+INTO)\s+[`"]?([a-zA-Z0-9_]+)[`"]?/i);
  if (!writeMatch) return;

  const action = writeMatch[1].toUpperCase().replace(/\s+/g, ' ');
  const table = writeMatch[2].toLowerCase();

  // Only sync recognized CRM tables
  if (!CRM_TABLES.includes(table)) return;

  try {
    if (action.startsWith('INSERT') || action.startsWith('REPLACE')) {
      await handleInsertSync(table, trimmed, params, resultRows);
    } else if (action === 'UPDATE') {
      await handleUpdateSync(table, trimmed, params);
    } else if (action === 'DELETE FROM') {
      await handleDeleteSync(table, trimmed, params);
    }
  } catch (err: any) {
    console.warn(`[MongoSync] Background sync skipped for ${table}:`, err.message);
  }
}

/**
 * Handle INSERT into MongoDB
 */
async function handleInsertSync(table: string, sql: string, params?: any[], resultRows?: any) {
  // 1. Check if an auto-increment ID was generated
  const insertId = resultRows && typeof resultRows === 'object' ? (resultRows as any).insertId : null;
  if (insertId && insertId > 0) {
    try {
      const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [insertId]);
      if (Array.isArray(rows) && rows.length > 0) {
        await mongoUpsert(table, (rows[0] as any).id || insertId, rows[0]);
        return;
      }
    } catch {}
  }

  // 2. Check if query specifies 'id' as the first or one of the parameters
  if (params && params.length > 0) {
    // If the first parameter is an ID string (e.g. 'ord-123', 'admin-1', 'lead-456')
    const firstParam = params[0];
    if (typeof firstParam === 'string' || typeof firstParam === 'number') {
      try {
        const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [firstParam]);
        if (Array.isArray(rows) && rows.length > 0) {
          await mongoUpsert(table, firstParam, rows[0]);
          return;
        }
      } catch {}
    }

    // 3. For bulk inserts (like bulk notifications)
    if (table === 'notifications' && sql.includes('VALUES')) {
      try {
        // Notification params typically has [id, userRole, title, message, orderId, isRead, createdAt]
        for (let i = 0; i < params.length; i += 7) {
          const notifId = params[i];
          if (notifId) {
            const [rows] = await pool.execute(`SELECT * FROM \`notifications\` WHERE id = ? LIMIT 1`, [notifId]);
            if (Array.isArray(rows) && rows.length > 0) {
              await mongoUpsert('notifications', notifId, rows[0]);
            }
          }
        }
        return;
      } catch {}
    }
  }
}

/**
 * Handle UPDATE in MongoDB
 */
async function handleUpdateSync(table: string, sql: string, params?: any[]) {
  if (!params || params.length === 0) return;

  // Most CRM UPDATE queries end with WHERE id = ?
  const whereIdMatch = sql.match(/WHERE\s+[`"]?id[`"]?\s*=\s*\?/i);
  if (whereIdMatch) {
    const id = params[params.length - 1];
    if (id !== undefined && id !== null) {
      try {
        const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
        if (Array.isArray(rows) && rows.length > 0) {
          await mongoUpsert(table, id, rows[0]);
          return;
        }
      } catch {}
    }
  }

  // Check WHERE userId = ? (e.g. employee_salary_profiles)
  const whereUserMatch = sql.match(/WHERE\s+[`"]?userId[`"]?\s*=\s*\?/i);
  if (whereUserMatch) {
    const userId = params[params.length - 1];
    if (userId !== undefined && userId !== null) {
      try {
        const [rows] = await pool.execute(`SELECT * FROM \`${table}\` WHERE userId = ? LIMIT 1`, [userId]);
        if (Array.isArray(rows) && rows.length > 0) {
          await mongoUpsert(table, userId, rows[0]);
          return;
        }
      } catch {}
    }
  }

  // Multi-row UPDATE (e.g. notifications marked as read)
  if (table === 'notifications' && sql.includes('UPDATE notifications SET isRead = 1')) {
    try {
      const [rows] = await pool.execute('SELECT * FROM `notifications` WHERE isRead = 1');
      if (Array.isArray(rows)) {
        for (const row of rows) {
          await mongoUpsert('notifications', (row as any).id, row);
        }
      }
    } catch {}
  }
}

/**
 * Handle DELETE from MongoDB
 */
async function handleDeleteSync(table: string, sql: string, params?: any[]) {
  // If no WHERE clause or DELETE FROM table, delete all
  if (!sql.includes('WHERE')) {
    await mongoDeleteMany(table, {});
    return;
  }

  if (params && params.length > 0) {
    for (const p of params) {
      if (p !== undefined && p !== null) {
        await mongoDelete(table, p);
      }
    }
  }
}
