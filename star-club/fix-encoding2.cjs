const fs = require('fs');
const path = require('path');

function walk(dir) {
  let r = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && e.name !== 'generated') r.push(...walk(full));
    else if (e.isFile() && (e.name.endsWith('.ts') || e.name.endsWith('.tsx'))) r.push(full);
  }
  return r;
}

// Map of corrupted → correct strings for single-char replacements
const FIXES = [
  // utils.ts
  ['\ufffdlite', 'Élite'],

  // avatar-review route
  ['c\ufffddul', 'cédul'],

  // uniforms export
  ['Presentaci\ufffdn', 'Presentación'],
  ['N\ufffdmero', 'Número'],

  // categories route
  ['categor\ufffda', 'categoría'],

  // payments reject
  ['cont\ufffdctate', 'contáctate'],

  // payments submit
  ['report\ufffd', 'reportó'],
  ['v\ufffda', 'vía'],

  // payments upload
  ['im\ufffdgenes', 'imágenes'],
  ['m\ufffdx', 'máx'],

  // profile route
  ['ya est\ufffd en uso', 'ya está en uso'],

  // admin attendance new
  ['sesi\ufffdn', 'sesión'],

  // admin attendance page - middle dot
  ['allLabel} \ufffd {', 'allLabel} · {'],
  ['} \ufffd {dict', '} · {dict'],

  // admin evidence
  ['revisi\ufffdn', 'revisión'],

  // admin page - middle dot
  ['\"Unassigned\"} \ufffd #', '"Unassigned"} · #'],

  // admin players
  ['c\ufffddig', 'códig'],
  ['categor\ufffda ${', 'categoría ${'],

  // admin reports - middle dot
  ['XP \ufffd Lv', 'XP · Lv'],

  // coach page - middle dot
  ['allCategories} \ufffd {', 'allCategories} · {'],

  // parent page - middle dot
  ['unassigned} \ufffd Jersey', 'unassigned} · Jersey'],
  ['En revisión\ufffdn', 'En revisión'],

  // parent profile
  ['informaci\ufffdn', 'información'],

  // layout
  ['gesti\ufffdn', 'gestión'],

  // avatar-review-list
  ['=\ufffd Fotos', '📷 Fotos'],
  ['c\ufffddul', 'cédul'],

  // bulk-payment-button
  ['autom\ufffdticamente', 'automáticamente'],
  ['ten\ufffda pago', 'tenía pago'],

  // gamification-actions - location labels
  ['"\\uFFFDx\\uFFFD\\uFFFD Casa"', '"🏠 Casa"'],
  ['"\\uFFFDxR\\uFFFD Parque"', '"🌳 Parque"'],
  ['"\\uFFFDx\\uFFFD\\uFFFD Cancha/Gym"', '"🏋 Cancha/Gym"'],
  ['"\\uFFFDS\u001c Agregar al sistema"', '"✅ Agregar al sistema"'],
  ['\u001c Agregar', ' Agregar'],

  // payment-actions
  ['!\ufffdRech', '!¿Rech'],

  // player-missions-client - middle dot
  ['Rechazada \ufffd reintentar', 'Rechazada · reintentar'],
  ['misi\ufffdn.', 'misión.'],

  // payment-submit-form - middle dot + verification
  ['Reportado \u0014 el', 'Reportado — el'],
  ['verific\ufffd', 'verificará'],
  ['v\ufffda Nequi', 'vía Nequi'],

  // uniform-order-form
  ['enviado \u001d el', 'enviado — el'],
];

const files = walk('src');
let totalFixed = 0;

files.forEach(f => {
  let s = fs.readFileSync(f, 'utf8');
  const orig = s;
  for (const [bad, good] of FIXES) {
    s = s.split(bad).join(good);
  }
  // Also fix gamification-actions section comments with \u001d control chars
  s = s.replace(/\/\* \ufffd[\u001d]?\ufffd\ufffd[\u001d]?\ufffd Assign Mission \ufffd[\u001d]?\ufffd\ufffd[\u001d]?\ufffd \*\//g, '/* 🎯 Assign Mission 🎯 */');
  s = s.replace(/\/\* \ufffd[\u001d]?\ufffd\ufffd[\u001d]?\ufffd Award XP \ufffd[\u001d]?\ufffd\ufffd[\u001d]?\ufffd \*\//g, '/* ⭐ Award XP ⭐ */');
  s = s.replace(/\/\* \ufffd[\u001d]?\ufffd\ufffd[\u001d]?\ufffd Generate with AI \ufffd[\u001d]?\ufffd\ufffd[\u001d]?\ufffd \*\//g, '/* ✨ Generate with AI ✨ */');
  // location labels in gamification-actions
  s = s.replace(/"\ufffd[^\uFFFD]{0,3}\ufffd Casa"/g, '"🏠 Casa"');
  s = s.replace(/"\ufffd[^\uFFFD]{0,3}\ufffd Parque"/g, '"🌳 Parque"');
  s = s.replace(/"\ufffd[^\uFFFD]{0,3}\ufffd Cancha\/Gym"/g, '"🏋 Cancha/Gym"');
  s = s.replace(/"\ufffd[^\u001c]{0,2}\u001c Agregar al sistema"/g, '"✅ Agregar al sistema"');

  if (s !== orig) {
    fs.writeFileSync(f, s, 'utf8');
    const remaining = (s.match(/\ufffd/g) || []).length;
    console.log('Fixed:', f.replace(/.*src./, 'src/'), '| remaining ufffd:', remaining);
    totalFixed++;
  }
});

console.log('\nTotal files fixed:', totalFixed);

// Final check
let totalRemaining = 0;
files.forEach(f => {
  const s = fs.readFileSync(f, 'utf8');
  const count = (s.match(/\ufffd/g) || []).length;
  if (count > 0) { console.log('STILL CORRUPT:', f.replace(/.*src./, 'src/'), count); totalRemaining += count; }
});
console.log('Total remaining corruption chars:', totalRemaining);
