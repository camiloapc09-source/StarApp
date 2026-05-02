# 📋 Sesión Actual

> **Memoria a corto plazo.** Claude lee este archivo al inicio de cada conversación para saber dónde quedó. Lo actualiza al final (o durante) la sesión. Cuando una tarea ya no es relevante, se borra de aquí — solo queda lo que importa ahora.

---

## ✅ Completado (sesión 2026-04-30)

| Tarea | Commit | Estado |
|---|---|---|
| Fix uniforme doble faz: campo libre + validación contra cualquier palabra del nombre | `fcb55c8` | ✅ |
| DELETE /api/payments/[id]: admin puede eliminar pagos erróneos desde la app | `fcb55c8` | ✅ |
| Pago de visitante: /dashboard/admin/payments/visitor — comprobante sin registro | `fcb55c8` | ✅ |
| Comprobante WhatsApp: imagen con diseño tipo Nequi (html2canvas + Web Share API) | `fcb55c8` | ✅ |
| Permisos granulares por coach: User.canInvite + PATCH /api/admin/coaches/[id]/permissions | `fcb55c8` | ✅ |
| Eliminar pagos falsos de Salomé de la DB directamente (IDs: cmoklc8nt..., cmokldgql...) | DB directo | ✅ |

---

## ✅ Completado (esta sesión)

| Tarea | Commit | Estado |
|---|---|---|
| `coachCanInvite`: toggle en Settings, API `/api/coach/invites`, página coach con candado | `1cfe3c5` | ✅ Producción |
| Mensaje WhatsApp humanizado: saludo Colombia + nombre club + emojis | `1cfe3c5` | ✅ Producción |
| Mensaje WhatsApp inteligente: detecta ventana de pronto pago de Ball Breakers | `1cfe3c5` | ✅ Producción |
| Comprobante padre → botón "Compartir por WhatsApp" (html2canvas → PNG) | `1cfe3c5` | ✅ Producción |
| Fix gender tabs multi-tenant: tabs solo aparecen si `genderedCount > 0` | `1cfe3c5` | ✅ Producción |
| **Fix raíz DB**: build script ahora incluye `prisma db push` — schema siempre sincronizado | `92320ed` | ✅ Producción |
| Eliminar scripts Turso (`export-turso.ts`, `import-to-neon.ts`, `turso-backup.json`) | `5f3e20b` | ✅ Producción |
| Limpiar `@libsql/client` de devDependencies | `92320ed` | ✅ Producción |
| Limpiar `.env` local: sin Turso, `SUPERADMIN_EMAIL` parseado correctamente | — | ✅ Local |
| Vault Obsidian: consolidar duplicado BallBreakers, actualizar Stack Tecnológico | — | ✅ Listo |

---

## ✅ Completado (sesión 2026-05-02)

| Tarea | Commit | Estado |
|---|---|---|
| Becas 50%/100%: campo `scholarshipPct` en Prisma + PATCH API + edit modal + badge en player detail | pendiente commit | ✅ |
| Indicador de descuento por pronto pago (activo/inactivo) en `/admin/payments` | pendiente commit | ✅ |
| Foto del deportista: endpoint `POST /api/admin/players/[id]/photo` (sin aprobación) + `AdminPlayerPhotoButton` | pendiente commit | ✅ |
| Reset contraseña: nueva opción "resetear al número de documento" en botón y API | pendiente commit | ✅ |

---

## 🔜 Pendientes

| Tarea | Prioridad | Notas |
|---|---|---|
| Landing page / website para StarApp | Alta | Necesaria para verificación de Meta (WhatsApp Business API) |
| WhatsApp IA para cobros (asistente de cobranza) | Alta | Bloqueado por verificación Meta |
| VAPID_EMAIL en Render → cambiar a email starshine | Baja | Actualmente usa email personal |

---

## 🧠 Contexto relevante para próxima sesión

### Fix crítico de DB (el más importante)

**Causa raíz de todos los crashes de DB:** el build script solo corría `prisma generate` pero nunca `prisma db push`. El cliente TypeScript sabía de las columnas nuevas pero la DB de Neon no las tenía → crash en runtime.

**Solución aplicada** en `package.json`:
```
"build": "prisma generate && prisma db push --accept-data-loss && next build"
```
A partir del commit `92320ed`, cada deploy sincroniza el schema automáticamente. Ya no se necesita aplicar columnas manualmente con MCP Neon.

### Estado actual de la DB vs Schema

Verificado con MCP Neon — todas las tablas y columnas están 100% sincronizadas:
- `Club`: incluye `coachCanInvite BOOLEAN DEFAULT false` ✅ (aplicado manualmente en esta sesión vía MCP)
- `Player`: incluye `gender`, `zone`, `height`, `weight` ✅
- `Session`: incluye `location` ✅
- Resto de tablas: sin drift ✅

### coachCanInvite

- Toggle en `/dashboard/admin/settings` → card "Permisos de entrenadores"
- API `POST /api/coach/invites`: verifica `club.coachCanInvite`, solo crea invites `role: PLAYER`
- Página `/dashboard/coach/invites`: si desactivado → pantalla con candado
- `NewInviteForm` acepta prop `endpoint` (default `/api/invites`). Coach usa `/api/coach/invites`
- Sidebar coach: ítem "Invitaciones" con `UserPlus` icon

### Mensaje de cobro multi-tenant

- Saludo dinámico: Buenos días (5–11h) / Buenas tardes (12–18h) / Buenas noches (19–4h) — hora Colombia
- Se identifica el club: `*${clubName}* 🏆`
- Ventana de pronto pago: si `colombiaDay` entre `billingCycleDay` y `billingCycleDay + earlyPaymentDays` → agrega línea del descuento
- Clubs sin descuento (`earlyPaymentDiscount = 0`): línea nunca aparece — multi-tenant limpio
- Aplica tanto en `BulkMarkReceivedPanel` (acción requerida) como en pagos programados en `payments/page.tsx`

### Gender tabs multi-tenant

- `db.player.count({ where: { clubId, gender: { not: null } } })` corre ANTES del query principal
- Star Club (todos `gender = null`) → `genderedCount = 0` → sin tabs, sin filtro de género
- Ball Breakers (`gender = "F"|"M"`) → tabs activas normalmente

### Vault Obsidian

- Nota canónica de Ball Breakers: `Ball Breakers - Info Completa.md` (con espacio)
- `BallBreakers - Info Completa.md` (sin espacio) → solo redirect, no borrar
- `Stack Tecnológico.md` actualizado con el build script correcto y la historia de Turso

### Credenciales superadmin (Star Club)

- Email: `admin@starclub.com`
- Contraseña: `admin123`
- SUPERADMIN no es un rol en DB — es quien tenga el email que coincida con `SUPERADMIN_EMAIL` en env vars

---

## 📌 Reglas de esta memoria

- Cuando termines algo → muévelo a "Completado" con el commit
- Cuando algo en "Completado" ya sea viejo y esté en producción estable → bórralo de aquí
- Solo agregar a pendientes cosas que el usuario pidió pero aún no se hicieron
