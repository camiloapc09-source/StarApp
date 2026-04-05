const fs = require('fs');

// layout.tsx
let s = fs.readFileSync('src/app/layout.tsx', 'utf8');
s = s.split('gamificaci\uFFFDn').join('gamificación');
fs.writeFileSync('src/app/layout.tsx', s, 'utf8');
console.log('layout.tsx done');

// gamification-actions.tsx - remaining emoji labels
s = fs.readFileSync('src/components/admin/gamification-actions.tsx', 'utf8');
// Replace all remaining corrupted location labels (x, xa, etc. variants)
while (s.includes('\uFFFD')) {
  const idx = s.indexOf('\uFFFD');
  const before = s.slice(Math.max(0, idx-15), idx+30);
  if (before.includes('Casa')) {
    s = s.slice(0, idx) + '🏠' + s.slice(idx+1);
    // Also remove junk chars between emoji and "Casa"
    s = s.replace(/\uFFFD[a-zA-Z0-9]{0,4} Casa/g, '🏠 Casa');
    s = s.replace(/🏠[a-zA-Z0-9\uFFFD]{0,4} Casa/g, '🏠 Casa');
  } else if (before.includes('Parque')) {
    s = s.slice(0, idx) + '🌳' + s.slice(idx+1);
    s = s.replace(/\uFFFD[a-zA-Z0-9]{0,4} Parque/g, '🌳 Parque');
    s = s.replace(/🌳[a-zA-Z0-9\uFFFD]{0,4} Parque/g, '🌳 Parque');
  } else if (before.includes('Cancha')) {
    s = s.slice(0, idx) + '🏋' + s.slice(idx+1);
    s = s.replace(/\uFFFD[a-zA-Z0-9]{0,4} Cancha/g, '🏋 Cancha');
    s = s.replace(/🏋[a-zA-Z0-9\uFFFD]{0,4} Cancha/g, '🏋 Cancha');
  } else if (before.includes('Agregar')) {
    s = s.slice(0, idx) + '✅' + s.slice(idx+1);
    s = s.replace(/\uFFFD[a-zA-Z0-9\u001c]{0,4} Agregar/g, '✅ Agregar');
  } else {
    // unknown, just remove
    s = s.slice(0, idx) + '?' + s.slice(idx+1);
  }
}
fs.writeFileSync('src/components/admin/gamification-actions.tsx', s, 'utf8');
const rem = (s.match(/\uFFFD/g) || []).length;
console.log('gamification-actions.tsx done, remaining ufffd:', rem);

// payment-actions.tsx
s = fs.readFileSync('src/components/admin/payment-actions.tsx', 'utf8');
s = s.split('\uFFFDRech').join('¿Rech');
fs.writeFileSync('src/components/admin/payment-actions.tsx', s, 'utf8');
console.log('payment-actions.tsx done');

// payment-submit-form.tsx
s = fs.readFileSync('src/components/parent/payment-submit-form.tsx', 'utf8');
s = s.split('verificar\uFFFD pronto').join('verificará pronto');
s = s.split('Reportado \u0014 el').join('Reportado — el');
fs.writeFileSync('src/components/parent/payment-submit-form.tsx', s, 'utf8');
console.log('payment-submit-form.tsx done');

// uniform-order-form.tsx
s = fs.readFileSync('src/components/parent/uniform-order-form.tsx', 'utf8');
s = s.split('enviado \uFFFD\u001d el').join('enviado — el');
s = s.split('enviado \uFFFD').join('enviado —');
fs.writeFileSync('src/components/parent/uniform-order-form.tsx', s, 'utf8');
console.log('uniform-order-form.tsx done');
