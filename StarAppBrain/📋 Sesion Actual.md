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

## ✅ Completado (sesión 2026-05-19)

| Tarea | Commit | Estado |
|---|---|---|
| **Módulo de Rifas completo**: cartón 100 números, multi-tenant, admin crea/gestiona, padre elige/paga | `df14621` | ✅ Producción |
| Schema: modelos `Raffle` + `RaffleTicket` + relaciones en `Club` y `User` | `df14621` | ✅ |
| API: CRUD rifas, claim/release tickets, upload comprobante (base64), verify pago | `df14621` | ✅ |
| Cartón 10×10 (00–99): colores por estado, logo del club, interactivo en admin y padre | `df14621` | ✅ |
| Admin: lista de rifas con stats + detalle con participantes + verificar pagos | `df14621` | ✅ |
| Padre: elegir números, subir comprobante, liberar número | `df14621` | ✅ |
| Navegación: sidebar + bottom-nav para admin y padre | `df14621` | ✅ |
| Vault actualizado: [[Rifas]], [[Rutas API]], [[000 - Inicio]] | — | ✅ |

---

## ✅ Completado (sesión 2026-05-20 — login por documento del hijo + panel Acudientes)

### Contexto
El flujo anterior usaba el documento del PADRE como clave (que no teníamos). Se cambió al documento del HIJO, que sí existe en DB desde el registro del jugador.

### Cambios implementados

| Tarea | Commit | Estado |
|---|---|---|
| **auth.ts — nuevo fallback**: si input sin @, busca padre por `parentPlayer.player.documentNumber` (para padres con email real, no @bb.internal) | `dd5ae71` | ✅ |
| **reset-password API**: al resetear padre con `resetToDocument=true`, también pone `setupCompleted=false` → fuerza re-setup | `dd5ae71` | ✅ |
| **reset-password-button**: botón "Resetear al documento del hijo" ahora visible para rol PARENT (antes solo PLAYER) | `dd5ae71` | ✅ |
| **Nueva página `/dashboard/admin/parents`**: lista todos los acudientes con sus hijos, documentos, pagos pendientes y botón de reset | `dd5ae71` | ✅ |
| **Sidebar admin**: enlace "Acudientes" con ícono `UsersRound` | `dd5ae71` | ✅ |
| **NewInviteForm**: acepta `defaultRole="PARENT"` para generar invites desde el panel de acudientes | `dd5ae71` | ✅ |
| **Locales**: clave `"parents": "Acudientes"` en es.json + en.json | `dd5ae71` | ✅ |
| **Tests Playwright 9/9**: flujo completo verificado en producción | `802e6e3` | ✅ |

### Flujo resultante para TODOS los padres

```
Karen va al panel Admin → Acudientes
    ↓
Busca al padre, clic "Resetear al documento del hijo"
    ↓
Sistema: password = hash(doc_hijo) + setupCompleted = false
    ↓
Karen le dice al padre: "Entra con el documento de [hijo] como usuario y clave"
    ↓
Padre entra con doc_hijo / doc_hijo → redirige a /setup
    ↓
Padre elige correo real + nueva contraseña + confirma hijos vinculados
    ↓
setupCompleted = true → entra al dashboard
```

**Nota**: los padres `@bb.internal` (migrados) siguen funcionando igual — su email ya tiene el formato `{doc_hijo}@bb.internal`, el fallback antiguo los encuentra sin tocarlos.

---

## ✅ Completado (sesión 2026-05-20 — onboarding automático de padres)

### Contexto
Ball Breakers tenía ~42 padres con email roto (número de cédula sin @, ej. `1043689342`). Karen tendría que corregirlos uno a uno. Se implementó una solución completamente automatizada donde cada padre resuelve el suyo solo.

### Cambios implementados

| Tarea | Commit | Estado |
|---|---|---|
| **Migración DB**: emails sin @ → `{doc}@bb.internal`; duplicados → `{doc}@acudiente.bb.internal` | SQL directo en Neon | ✅ |
| **Auth fallback**: si el input no tiene @, busca `{input}@bb.internal` automáticamente | `6e41676` | ✅ |
| **Schema + campo**: `User.setupCompleted Boolean @default(false)` — ALTER TABLE ejecutado en Neon | `4d7df1f` | ✅ |
| **JWT/Session**: `setupCompleted` + `clubSlug` se propagan en el token | `4d7df1f` | ✅ |
| **Middleware**: todos los padres con `setupCompleted=false` → redirige a `/dashboard/parent/setup` | `4d7df1f` | ✅ |
| **GET /api/parent/setup**: devuelve jugadores activos del club + los ya vinculados + email actual | `4d7df1f` | ✅ |
| **PATCH /api/parent/setup**: actualiza email + password + re-vincula hijos + marca `setupCompleted=true` | `4d7df1f` | ✅ |
| **Página /dashboard/parent/setup**: correo (pre-rellenado si era real) + contraseña + lista buscable de jugadores con checkboxes | `4d7df1f` | ✅ |
| **Registro via invite** (`/api/invites/redeem`): marca `setupCompleted=true` al crear cuenta + acepta `additionalDocs[]` para vincular hijos extra | `4d5a9e0` | ✅ |
| **Form de registro**: sección "Más hijos en el club" con inputs dinámicos de documento | `4d5a9e0` | ✅ |
| **Tests Playwright**: 5 tests e2e contra el deploy en Render — todos pasan ✅ | `56e4298` | ✅ |

### Flujo resultante

**Padres existentes con email roto (42 en Ball Breakers):**
```
Padre escribe su número de cédula como usuario + clave
    ↓
Auth lo encuentra como {doc}@bb.internal (automático)
    ↓
Middleware detecta setupCompleted=false → redirige a /setup
    ↓
Padre ve formulario: correo real + contraseña + lista de hijos
    ↓
Guarda → setupCompleted=true → re-login automático → dashboard
```
**Una sola vez. Sin intervención de Karen.**

**Padres nuevos (invite):**
- Se registran con su propio correo/contraseña → `setupCompleted=true` desde el inicio
- Pueden agregar documentos de hijos adicionales en el mismo formulario de registro

**Padres con correo real preexistente:**
- También pasan por /setup si `setupCompleted=false`
- El correo aparece pre-rellenado; solo ponen contraseña y vinculan hijos

---

## 🔜 Pendientes

| Tarea | Prioridad | Notas |
|---|---|---|
| **Comunicarle a Karen el flujo nuevo**: Admin → Acudientes → "Resetear al documento del hijo" → decirle al padre "Entra con el doc de tu hijo" | Inmediata | Deploy + tests OK |
| Katerin Perez (mamá de un jugador) → Karen debe crear el jugador primero, luego invitar a Katerin | Alta | No existe en DB |
| Padres con 2 hijos (ADONIS, Fernando Sarmiento, Yula Jiménez, Luis Carmona) → el segundo hijo lo vinculan ellos mismos en la pantalla de setup | Media | Cuentas duplicadas en DB — pueden fusionarse en /setup |
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
