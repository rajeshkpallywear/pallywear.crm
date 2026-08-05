/**
 * Server-side patch script — run this once on the server via:
 *   node patch_server.js
 * This patches api.js (or api.ts) to add resolveOrderId() so orders
 * with #-prefixed IDs in the database are found correctly.
 */
const fs = require('fs');
const path = require('path');

// Try to find the api file - check common locations
const candidates = [
  path.join(__dirname, 'api.js'),
  path.join(__dirname, 'api.ts'),
  path.join(__dirname, 'dist', 'api.js'),
];

let filePath = null;
for (const c of candidates) {
  if (fs.existsSync(c)) { filePath = c; break; }
}

if (!filePath) {
  console.error('❌ Could not find api.js or api.ts. Run this from the app root directory.');
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');
const backup = filePath + '.backup_' + Date.now();

// Check if already patched
if (content.includes('resolveOrderId')) {
  console.log('✅ Already patched! No changes needed.');
  process.exit(0);
}

// Make backup
fs.writeFileSync(backup, content);
console.log('📦 Backup saved to:', backup);

// Patch 1: Add resolveOrderId() after sanitizeId()
const sanitizeFn = content.includes('function sanitizeId')
  ? 'function sanitizeId'
  : null;

if (!sanitizeFn) {
  console.error('❌ Could not find sanitizeId function. Is this the right file?');
  process.exit(1);
}

const resolveOrderIdFn = `
async function resolveOrderId(rawId) {
  const clean = (rawId || '').replace(/#/g, '');
  try {
    const rows = await query('SELECT id FROM orders WHERE id = ? OR id = ?', [clean, '#' + clean]);
    return rows.length > 0 ? rows[0].id : null;
  } catch(e) { return clean; }
}
`;

// Insert resolveOrderId before sanitizeId (or after it)
content = content.replace(
  /\/\/ Strip #[^\n]*\nfunction sanitizeId/,
  `${resolveOrderIdFn}\n// Strip #-prefix chars from IDs\nfunction sanitizeId`
);

// Patch 2: Fix handleUpdateOrderFields to use resolveOrderId
// Replace the existing WHERE id = ? with OR id = ? lookup
content = content.replace(
  /FROM orders WHERE id = \?['"]?\s*\]\s*(as any\[\])?;?\s*\n\s*if \(existing\.length === 0\) \{[\s\S]*?return res\.status\(404\)[^\n]*\n\s*\}/,
  `FROM orders WHERE id = ? OR id = ?', [id, '#' + id]) as any[];
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }`
);

fs.writeFileSync(filePath, content);
console.log('✅ Patch applied successfully to:', filePath);
console.log('🔄 Now run: pm2 restart all');
