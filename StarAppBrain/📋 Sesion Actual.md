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

---

## ✅ Completado (sesión 2026-05-02)

| Tarea | Commit | Estado |
|---|---|---|
| Becas 50%/100%: campo `scholarshipPct` en Prisma + PATCH API + edit modal + badge en player detail | f7b17a4 | ✅ Producción |
| Indicador de descuento por pronto pago (activo/inactivo) en `/admin/payments` | f7b17a4 | ✅ Producción |
| Foto del deportista: endpoint `POST /api/admin/players/[id]/photo` + `AdminPlayerPhotoButton` | f7b17a4 | ✅ Producción |
| Reset contraseña por número de documento | f7b17a4 | ✅ Producción |

---

## ✅ Completado (sesión 2026-05-03 — esta sesión)

| Tarea | Archivo(s) | Estado |
|---|---|---|
| **Playwright MCP**: instalado y conectado (`npx @playwright/mcp@latest`) | `.claude.json` | ✅ Listo |
| **Becas % libre (1–100%)**: Karen puede dar cualquier porcentaje, no solo 50% o 100% | `api/players/[id]/route.ts` · `admin-edit-player-button.tsx` · `player/[id]/page.tsx` · `schema.prisma` | ✅ |
| **Bug crítico asistencia por sede**: coach veía TODOS los jugadores del club, ahora filtra por `sess.location` + `sess.categoryId` | `coach/attendance/[id]/page.tsx` | ✅ |
| **Búsqueda en asistencia**: input de búsqueda por nombre + botón "Todos excusados" | `attendance-form.tsx` | ✅ |
| **Página de pagos para jugador**: antes era redirect vacío, ahora muestra KPIs + pendientes + historial | `player/payments/page.tsx` | ✅ |
| **Leaderboard con posición real**: jugador siempre visible aunque no esté en top 20; separador `···` | `player/stats/page.tsx` · `leaderboard.tsx` | ✅ |
| **Selector de hijo en parent/reports**: padres con 2+ hijos pueden cambiar entre ellos (`?child=playerId`) | `parent/reports/page.tsx` | ✅ |
| **Notas y sede en sesiones próximas**: `UpcomingSessionsCard` ahora muestra `notes` y `location` | `upcoming-sessions-card.tsx` | ✅ |
| **Fix error silencioso en upload de comprobante**: padre ve el error si falla la subida y no puede enviar sin resolver | `payment-submit-form.tsx` | ✅ |

---

## ✅ Completado (sesión 2026-05-06)

| Tarea | Archivo | Estado |
|---|---|---|
| **Fix login Ball Breakers**: deportistas no podían iniciar sesión escribiendo solo su documento | `lib/auth.ts` | ✅ |

**Causa**: el auth buscaba `email = "1046723097"` pero en DB estaba `1046723097@bb.internal`.
**Solución**: si el input no tiene `@`, buscar con `email: { startsWith: doc.toLowerCase() + "@" }` — funciona para cualquier club con emails internos.

---

## 🔜 Pendientes

| Tarea | Prioridad | Notas |
|---|---|---|
| Landing page / website para StarApp | Alta | Necesaria para verificación de Meta (WhatsApp Business API) |
| WhatsApp IA para cobros (asistente de cobranza) | Alta | Bloqueado por verificación Meta |
| VAPID_EMAIL en Render → cambiar a email starshine | Baja | Actualmente usa email personal |
| Historial de asistencia para coaches (`/coach/attendance` index) | Media | Actualmente redirige a sessions — ver audit |
| Push notifications para jugadores/padres | Media | Endpoint existe, falta automatización |
| Notificación cuando se cancela una sesión | Media | Al eliminar sesión → crear notifs para jugadores + padres |
| Filtros y búsqueda en `/admin/payments` | Media | Página de 512 líneas sin search |

---

## 🧠 Contexto relevante para próxima sesión

### Fix DB (el más importante — ya resuelto)

**Build script** en `package.json`:
```
"build": "prisma generate && prisma db push --accept-data-loss && next build"
```
Cada deploy sincroniza el schema automáticamente. No se necesita aplicar columnas manualmente.

### Playwright MCP

Instalado globalmente para el proyecto Star App:
- Comando: `npx @playwright/mcp@latest`
- Chromium instalado en `C:\Users\Usuario\AppData\Local\ms-playwright\chromium-1217`
- **IMPORTANTE**: Las herramientas de Playwright MCP solo están disponibles en el CLI de Claude Code (`claude` en terminal), NO en la extensión de VSCode. Si el usuario quiere auditar la app con Playwright, debe usar el CLI.
- Dev server: `npm run dev` en `star-club/` → localhost:3000

### Becas (ahora con % libre)

El sistema de becas ahora acepta **cualquier entero de 1 a 100** (antes solo 50 o 100).
- API: `z.number().int().min(1).max(100).optional().nullable()`
- UI: botones rápidos (Sin beca / 50% / 100%) + input editable que aparece cuando hay beca activa
- Cálculo: `Math.round(precioZona × (pct / 100))` — funciona para cualquier porcentaje
- Badge en player detail: muestra `BECA {pct}%` (antes hardcodeado a 50% o 100%)
- DB: `Player.scholarshipPct Int?` — campo ya existía, no se necesita migración

### Bug de asistencia por sede (resuelto)

**Causa**: `coach/attendance/[id]/page.tsx` filtraba por `categoryId` pero ignoraba `sess.location`.
**Solución**: filtro en cascada:
1. `categoryId + zone` (más específico)
2. Solo `categoryId` si el combo anterior da 0
3. Solo `zone` si no hay categoría
4. Fallback: todos los activos (solo si sesión sin categoría Y sin sede)

### Credenciales superadmin (Star Club)

- Email: `admin@starclub.com`
- Contraseña: `admin123`
- Slug: `star-club`

### Estado DB vs Schema

Todas las columnas sincronizadas. Cambios de esta sesión son solo en lógica/UI, no en schema — no se requiere migración.

---

## 📌 Reglas de esta memoria

- Cuando termines algo → muévelo a "Completado" con el commit
- Cuando algo en "Completado" ya sea viejo y esté en producción estable → bórralo de aquí
- Solo agregar a pendientes cosas que el usuario pidió pero aún no se hicieron
