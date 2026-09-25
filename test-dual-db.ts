import { pool, query } from './db';
import { initMongoDB, isMongoConnected, sanitizeMongoUri, getMongoStatus, CRM_TABLES } from './mongodb';

async function main() {
  console.log('--- Testing Dual-Database Setup ---');
  console.log('CRM Tables mapped for sync:', CRM_TABLES.length, CRM_TABLES);
  console.log('Sanitized MongoDB URI (hidden password):', sanitizeMongoUri().replace(/:([^@]+)@/, ':***@'));

  // Test MongoDB Init
  const mongoOk = await initMongoDB();
  console.log('MongoDB Connected:', mongoOk, 'isMongoConnected:', isMongoConnected());
  const status = await getMongoStatus();
  console.log('MongoDB Status:', status);

  // Close connections
  try {
    await pool.end();
  } catch {}
  process.exit(0);
}

main().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
