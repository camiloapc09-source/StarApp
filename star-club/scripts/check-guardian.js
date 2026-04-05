const db = require('better-sqlite3')('dev.db');

// List all tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Check ParentPlayer table
try {
  const cols = db.prepare('PRAGMA table_info(ParentPlayer)').all();
  console.log('\nParentPlayer columns:', cols.map(c => c.name).join(', '));
  const rows = db.prepare('SELECT * FROM ParentPlayer LIMIT 5').all();
  console.log('ParentPlayer rows:', JSON.stringify(rows, null, 2));
} catch(e) { console.log('ParentPlayer error:', e.message); }

// Check Parent table
try {
  const cols = db.prepare('PRAGMA table_info(Parent)').all();
  console.log('\nParent columns:', cols.map(c => c.name).join(', '));
  const rows = db.prepare('SELECT * FROM Parent LIMIT 5').all();
  console.log('Parent rows:', JSON.stringify(rows, null, 2));
} catch(e) { console.log('Parent error:', e.message); }

// Find Mateo's userId
const mateo = db.prepare("SELECT pl.id as playerId, pl.userId FROM Player pl JOIN User u ON u.id=pl.userId WHERE u.name LIKE '%Mateo%'").get();
console.log('\nMateo:', mateo);

db.close();
