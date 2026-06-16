# UX Audit y Mejoras

← [[000 - Inicio]]

> Resultado del audit con análisis de código del 2026-05-03. 37 issues encontrados. Los resueltos están marcados ✅.

---

## Resueltos (2026-06-16)

| Problema | Archivo | Fix |
|----------|---------|-----|
| Jugadores: sin buscador, tocaba scroll entre 135 filas | `player-search.tsx` (nuevo) · `admin/players/page.tsx` | Búsqueda por nombre/correo/documento/dorsal vía `?q=` |
| Pagos: un mismo jugador aparecía repetido (1 fila por mes vencido) | `bulk-mark-received-panel.tsx` | Agrupado por jugador, expandible; checkbox de grupo selecciona todos sus meses |
| Becado 100% con deuda fantasma (cobros viejos no se borraban) | `api/players/[id]/route.ts` | Al marcar 100% se cancelan pagos PENDING/OVERDUE/SUBMITTED |
| Logins de acudientes enredados (doc del hijo como clave, ambiguo con 2 hijos) | `api/admin/parents/bulk-reset/route.ts` + botón | Reseteo masivo a clave temp `123456789`, doc del hijo = usuario |

## Pendientes detectados (2026-06-16) — auditoría de esta sesión

### `/admin/payments` hace trabajo pesado en cada render — ALTA
La página marca vencidos y crea notificaciones "due-soon" con **consultas dentro de bucles (N+1)** en cada visita (`payments/page.tsx:34-107`). Con 201+ pagos esto va a ir lento. **Fix sugerido:** mover a un cron/route aparte (`/api/payments/mark-overdue` ya existe) y dejar la página solo de lectura.

### Lista de jugadores sin paginación — MEDIA
135 filas se cargan de golpe. El buscador ayuda, pero conviene paginar o virtualizar.

### Plantilla de WhatsApp duplicada — MEDIA
El mismo texto de cobro está repetido casi idéntico en `payments/page.tsx`, `bulk-mark-received-panel.tsx` y otros. **Fix:** extraer a un helper `lib/whatsapp.ts`.

### Detección de acudientes duplicados por nombre normalizado — BAJA
`parents/page.tsx` agrupa por `name.trim().toLowerCase()`. Nombres con tildes/typos no agrupan. Considerar agrupar por teléfono/documento.

---

## Resueltos (2026-05-03)

| # | Problema | Archivo | Fix aplicado |
|---|----------|---------|-------------|
| — | Bug: coach ve todos los jugadores sin filtrar por sede | `coach/attendance/[id]/page.tsx` | Filtro cascada: categoryId+zone → solo categoryId → solo zone → fallback |
| — | Búsqueda en asistencia + botón "Todos excusados" | `attendance-form.tsx` | Input search + bulk EXCUSED |
| — | Página de pagos del jugador era redirect vacío | `player/payments/page.tsx` | Página real con KPIs, pendientes e historial |
| — | Leaderboard no mostraba posición si jugador fuera del top 20 | `player/stats/page.tsx` · `leaderboard.tsx` | Siempre incluye al jugador; separador `···`; posición real con count query |
| — | Padres con 2+ hijos veían siempre al primer hijo en reportes | `parent/reports/page.tsx` | Selector de hijo por `?child=playerId` |
| — | Notas y sede no visibles en "Próximos entrenos" | `upcoming-sessions-card.tsx` | Muestra `notes` y `location` en cada sesión |
| — | Error silencioso al fallar upload de comprobante | `payment-submit-form.tsx` | Retorna `boolean`; bloquea submit si falla |

---

## Pendientes — Alta prioridad

### Coach no puede ver historial de asistencia pasada
`/dashboard/coach/attendance` redirige a sessions. No hay página índice con historial por sesión.
- **Fix:** crear página índice que liste sesiones pasadas con % de asistencia

### Notificación al cancelar sesión
Si un coach elimina una sesión, los jugadores y padres no se enteran.
- **Fix:** al DELETE de sesión → crear notifications para todos los players asignados + sus padres

### ✅ Admin payments — buscador (resuelto 2026-05-20)
Input de búsqueda por nombre del jugador o concepto, filtra las 4 secciones (por verificar / acción requerida / programados / confirmados). Usa URL params `?q=` para mantener SSR.

---

## Pendientes — Media prioridad

### Multi-child parent — payments y uniforms
El selector de hijo se implementó en `/reports`. Falta en:
- `/dashboard/parent/payments` → también hardcodea `children[0]`
- `/dashboard/parent/uniforms` → igual

**Fix:** mismo patrón `?child=playerId` que se aplicó en reports.

### Push notifications para jugadores/padres
Los endpoints existen (`/api/notifications`), pero no hay triggers automáticos para:
- Pago próximo a vencer (7 días antes)
- Pago vencido
- Sesión asignada cancelada
- Misión completada / XP ganado

### Asistencia: contexto antes de tomar lista
El coach llega directo al form sin saber el squad size esperado ni el % histórico de esa sesión.

### Coach: asignar misión a categoría entera
Solo puede asignar misiones de a un jugador. Necesita bulk assign por categoría.

---

## Pendientes — Baja prioridad

| Problema | Archivo | Fix sugerido |
|----------|---------|-------------|
| Attendance rate sin leyenda de colores | Multiple | Agregar leyenda: verde ≥80%, amarillo ≥60%, rojo <60% |
| Notif auto-mark overdue sin feedback al admin | `admin/payments/page.tsx` | Toast al admin cuando se auto-marcan pagos como vencidos |
| Sesión eliminada sin notif | API delete | Notif push/in-app a jugadores y padres |
| Mobile nav: jugador sin notificaciones en tabs | `bottom-nav.tsx` | Agregar notif bell al bottom nav de jugadores |

---

## Arquitectura de los fixes de jugador

### Leaderboard — cómo funciona el rank real

```tsx
// stats/page.tsx
const [top20, myTrueRank, totalActivePlayers] = await Promise.all([
  db.player.findMany({ ...orderBy: xp desc, take: 20 }),
  db.player.count({ where: { xp: { gt: player.xp } } }).then(n => n + 1),
  db.player.count({ where: { clubId, status: "ACTIVE" } }),
]);

// Si el jugador no está en top 20, se agrega al final del array
const leaderboardPlayers = playerInTop20 ? top20 : [...top20, playerEntry];
```

El componente `Leaderboard` muestra un separador `···` antes del jugador si está fuera del top 20, y usa `trueRank` para mostrar su posición global correcta.

### Player payments — estructura

```
/dashboard/player/payments
  → KPIs: total pendiente / pagos completados
  → Card "Pagos pendientes" con alerta visual
  → Card "Historial completo" (últimos 36)
  → Banner informativo si tiene beca activa
```

Ver también: [[Sesiones y Asistencia]] | [[Becas]] | [[Notificaciones y Push]]
