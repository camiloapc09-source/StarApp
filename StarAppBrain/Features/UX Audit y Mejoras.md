# UX Audit y Mejoras

← [[000 - Inicio]]

> Resultado del audit con análisis de código del 2026-05-03. 37 issues encontrados. Los resueltos están marcados ✅.

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

### Admin payments sin búsqueda/filtros
Página de 512 líneas sin input de búsqueda. Difícil encontrar un jugador específico con 100+ registros.
- **Fix:** chips de estado (Todos / Pendiente / Vencido / Pagado) + input search por nombre

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
