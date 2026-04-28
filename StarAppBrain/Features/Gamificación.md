# Gamificación

← [[000 - Inicio]] | [[Schema Completo]]

---

## Sistema XP y Niveles

Cada jugador tiene en su perfil (`Player`):
- `xp` → puntos de experiencia acumulados
- `level` → nivel calculado a partir del XP
- `streak` → racha de asistencia consecutiva
- `lastActive` → última vez que participó en algo

## Misiones

Las misiones son retos que el admin crea para los jugadores.

| Tipo | Periodicidad |
|---|---|
| `DAILY` | Se resetean cada día |
| `WEEKLY` | Se resetean cada semana |
| `CHALLENGE` | Sin fecha fija, se completan cuando se logran |
| `SPECIAL` | Eventos únicos |

### Estados de una PlayerMission

```
ACTIVE    → el jugador tiene la misión asignada y activa
COMPLETED → cumplió el objetivo
EXPIRED   → se acabó el tiempo sin completarla
```

### Evidencias

Para misiones que requieren prueba física (ej: "Sube una foto haciendo 50 abdominales"):
- El jugador sube una `Evidence` (foto/video)
- El admin/coach la revisa: `ACCEPTED` o `REJECTED`
- Si se acepta, la misión avanza o se completa

## Recompensas

Las `Reward` se desbloquean al llegar a cierto nivel (`levelRequired`).
Cuando un jugador alcanza el nivel necesario, se crea un `PlayerReward`.

## Generación automática de misiones

El endpoint `POST /api/missions/generate` puede crear misiones automáticamente para los jugadores según su historial de asistencia y progreso.

---

## Ideas para IA

- Generar misiones personalizadas según el perfil del jugador (asistencia, posición, nivel)
- Detectar jugadores en riesgo de perder su streak y enviarles motivación
- Crear eventos especiales de gamificación (torneos de puntos, etc.)
- Notificación automática cuando un jugador sube de nivel

Ver también: [[Sesiones y Asistencia]] | [[Notificaciones y Push]] | [[Tareas Automatizables]]
