const Database = require('better-sqlite3');
const db = new Database('dev.db');

// 1. Delete sample/seed missions (keeping any custom ones created after)
const sampleIds = ['mission-score', 'mission-attend', 'mission-first', 'mission-assist', 'mission-champion'];
for (const id of sampleIds) {
  // Delete PlayerMissions referencing this mission first
  db.prepare('DELETE FROM PlayerMission WHERE missionId = ?').run(id);
  db.prepare('DELETE FROM Mission WHERE id = ?').run(id);
}
console.log('Deleted sample missions');

// 2. Find Salomé and assign category
const salome = db.prepare(`
  SELECT pl.id, pl.categoryId, u.name,
    CAST((julianday('now') - julianday(pl.dateOfBirth)) / 365.25 AS INTEGER) as age
  FROM Player pl
  JOIN User u ON u.id = pl.userId
  WHERE u.name LIKE '%Salom%'
`).get();

if (!salome) {
  console.log('Salomé not found');
} else {
  console.log('Salomé:', salome);
  const cats = db.prepare('SELECT id, name, ageMin, ageMax FROM Category ORDER BY ageMin').all();
  console.log('Categories:', cats);

  const match = cats.find(c => salome.age >= c.ageMin && salome.age <= c.ageMax);
  if (match) {
    db.prepare('UPDATE Player SET categoryId = ? WHERE id = ?').run(match.id, salome.id);
    console.log(`Assigned "${match.name}" (${match.ageMin}-${match.ageMax}) to Salomé (age ${salome.age})`);
  } else if (cats.length > 0) {
    // Assign to youngest category if no exact match
    const youngest = cats[0];
    db.prepare('UPDATE Player SET categoryId = ? WHERE id = ?').run(youngest.id, salome.id);
    console.log(`No category match for age ${salome.age}, assigned "${youngest.name}" instead`);
  } else {
    console.log('No categories found in DB');
  }
}

// 3. Fix March payment: make sure Mateo has exactly one OVERDUE March payment
const mateo = db.prepare(`
  SELECT pl.id FROM Player pl JOIN User u ON u.id=pl.userId WHERE u.name LIKE '%Mateo%'
`).get();
if (mateo) {
  const march = db.prepare(`SELECT * FROM Payment WHERE playerId=? AND dueDate LIKE '2026-03%'`).all(mateo.id);
  console.log('\nMateo March payments:', march.length);
  // Remove duplicates, keep first
  if (march.length > 1) {
    for (let i = 1; i < march.length; i++) {
      db.prepare('DELETE FROM Payment WHERE id = ?').run(march[i].id);
    }
    console.log('Removed duplicate March payments');
  }
  // Ensure the remaining one is OVERDUE
  if (march.length >= 1) {
    db.prepare("UPDATE Payment SET status='OVERDUE', paidAt=NULL WHERE id=?").run(march[0].id);
    console.log('Confirmed March payment is OVERDUE');
  }
}

const remaining = db.prepare('SELECT id, title FROM Mission').all();
console.log('\nRemaining missions:', remaining);

db.close();
