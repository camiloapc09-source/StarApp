const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../dev.db'));

// This script's work is done. Just show current state.
const player = db.prepare(`
  SELECT pl.id FROM Player pl
  JOIN User u ON u.id = pl.userId
  WHERE u.name LIKE '%Mateo%'
`).get();

const payments = db.prepare(`
  SELECT id, status, dueDate, paidAt, concept, amount
  FROM Payment WHERE playerId=? ORDER BY dueDate ASC
`).all(player.id);

console.log('Mateo payments:', JSON.stringify(payments, null, 2));
db.close();

const db = new Database(path.join(__dirname, '../dev.db'));

// Find Mateo's player ID
const player = db.prepare(`
  SELECT pl.id FROM Player pl
  JOIN User u ON u.id = pl.userId
  WHERE u.name LIKE '%Mateo%'
`).get();

console.log('Player:', player);

// 1. Restore the May 18 future payment back to PENDING (I wrongly marked it OVERDUE)
const may = db.prepare("SELECT id, dueDate FROM Payment WHERE playerId=? AND status='OVERDUE'").all(player.id);
console.log('May payment (wrongly marked OVERDUE):', may);
for (const p of may) {
  db.prepare("UPDATE Payment SET status='PENDING' WHERE id=?").run(p.id);
}

// 2. Create the March 18 OVERDUE payment (the real one that was wrongly marked as paid and deleted)
const existing = db.prepare("SELECT id FROM Payment WHERE playerId=? AND dueDate LIKE '2026-03%'").get(player.id);
if (!existing) {
  const newId = 'march18-fix-' + Date.now();
  db.prepare(`
    INSERT INTO Payment (id, playerId, amount, concept, dueDate, status, createdAt)
    VALUES (?, ?, 70000, 'Mensualidad', '2026-03-18T05:00:00.000Z', 'OVERDUE', datetime('now'))
  `).run(newId, player.id);
  console.log('Created March 18 OVERDUE payment:', newId);
} else {
  db.prepare("UPDATE Payment SET status='OVERDUE', paidAt=NULL WHERE id=?").run(existing.id);
  console.log('Updated March payment to OVERDUE');
}

// Confirm final state
const after = db.prepare(`
  SELECT id, status, dueDate, paidAt, concept, amount
  FROM Payment
  WHERE playerId=?
  ORDER BY dueDate ASC
`).all(player.id);
console.log('\nFinal state:', JSON.stringify(after, null, 2));
db.close();

