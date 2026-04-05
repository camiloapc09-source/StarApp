const Database = require('better-sqlite3');
const db = new Database('dev.db');

// Check Player columns
const cols = db.prepare('PRAGMA table_info(Player)').all();
console.log('Player columns:', cols.map(c => c.name).join(', '));

// Check Mateo's full data
const mateo = db.prepare("SELECT * FROM Player WHERE id='cmnhl62z400029cv9wasvv89e'").get();
console.log('\nMateo player row:', JSON.stringify(mateo, null, 2));

// Check User record
const user = db.prepare("SELECT * FROM User WHERE id='" + mateo.userId + "'").get();
console.log('\nMateo user row fields:', Object.keys(user).join(', '));
console.log('phone:', user.phone);
console.log('parentPhone (on user?):', user.parentPhone);

// Check User table columns
const userCols = db.prepare('PRAGMA table_info(User)').all();
console.log('\nUser columns:', userCols.map(c => c.name).join(', '));

// Check ParentLink
const parentLinks = db.prepare("SELECT * FROM ParentLink WHERE playerId='cmnhl62z400029cv9wasvv89e'").all();
console.log('\nMateo parentLinks:', JSON.stringify(parentLinks, null, 2));

db.close();
