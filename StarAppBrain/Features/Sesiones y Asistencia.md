# Sesiones y Asistencia

← [[000 - Inicio]] | [[Schema Completo]]

---

## Qué es una Session

Una sesión representa un entrenamiento, partido o evento del club.

| Campo | Descripción |
|---|---|
| `type` | TRAINING / MATCH / EVENT |
| `date` | Fecha y hora del evento |
| `categoryId` | A qué categoría pertenece |
| `coachId` | Entrenador responsable |
| `location` | Sede donde se realiza (SUR / CENTRO / NORTE / etc.) — solo clubs con `zonePrices` |
| `notes` | Observaciones del entrenador (visible a jugadores en "Próximos entrenos") |

### Sede en sesiones

El campo `location` se puebla desde las claves del JSON `club.zonePrices`. Si el club no tiene `zonePrices`, el selector de sede no aparece. Esto permite que clubs multi-sede (como BallBreakers: SUR, CENTRO, NORTE) distingan dónde se hace cada sesión — relevante porque cada sede tiene horarios y grupos distintos.

---

## Flujo de registro de asistencia

```
1. Admin / Coach crea la sesión (POST /api/sessions)

2. En la sesión, registra asistencia masiva (POST /api/attendance)
   → Envía array con { playerId, status } para cada jugador

3. Estados posibles por jugador:
   PRESENT → estuvo
   ABSENT  → no fue
   LATE    → llegó tarde
   EXCUSED → falta justificada
```

---

## Filtrado de jugadores al tomar asistencia

**Archivo:** `src/app/dashboard/coach/attendance/[id]/page.tsx`

El sistema filtra qué jugadores aparecen en la pantalla de asistencia usando una cascada:

```
1. categoryId + zone    → los más específicos (jugadores de esa categoría Y esa sede)
2. Solo categoryId      → si el combo anterior devuelve 0 jugadores
3. Solo zone            → si la sesión no tiene categoría pero sí sede
4. Todos activos        → fallback absoluto (sesión sin categoría ni sede)
```

**⚠️ Bug histórico (resuelto 2026-05-03):** antes el código ignoraba `sess.location` completamente — al coach le aparecían TODOS los jugadores activos del club sin importar la sede. El fix añade el filtro en cascada descrito arriba.

---

## UI del formulario de asistencia

**Archivo:** `src/components/coach/attendance-form.tsx`

- Búsqueda por nombre (input con ícono de lupa) — filtra la lista en tiempo real
- Botones bulk: **Todos presentes** / **Todos ausentes** / **Todos excusados**
- Contador de presentes / tardíos / ausentes en tiempo real
- Botón "Guardar asistencia" con estado `loading` / `disabled`

---

## Visibilidad para jugadores

### Card "Próximos entrenos y partidos"

**Archivo:** `src/components/shared/upcoming-sessions-card.tsx`

Los jugadores ven las próximas sesiones de su categoría (o sin categoría). Desde 2026-05-03 también se muestra:
- **Sede** (`location`) — dónde es la sesión
- **Notas del entrenador** (`notes`) — instrucciones especiales, con borde izquierdo de acento

### Historial en `/dashboard/player/stats`

El jugador puede ver su historial completo de asistencias (sesiones, estado, fecha) con resumen por mes.

---

## Impacto en Gamificación

La asistencia alimenta el sistema de XP y streak:
- Asistir a sesiones da XP al jugador
- Varias asistencias consecutivas construyen el `streak`
- El `lastActive` se actualiza con cada asistencia

## Misiones relacionadas a asistencia

Ejemplo de misión: "Asiste a 5 entrenamientos esta semana" (PlayerMission con `target: 5`)
Cada vez que el sistema registra PRESENT, incrementa el `progress` de esa misión.

---

## Automatizaciones posibles con IA

- Crear sesiones recurrentes automáticamente (ej: cada martes y jueves a las 4pm)
- Notificar a jugadores un día antes de su entrenamiento
- **Notificar cuando se cancela una sesión** (pendiente): al eliminar → notif a jugadores + padres
- Alertar al admin si hay sesiones programadas sin asistencia registrada
- Detectar jugadores con múltiples ausencias y notificar al coach

Ver también: [[Gamificación]] | [[Tareas Automatizables]]
