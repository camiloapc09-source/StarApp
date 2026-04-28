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
| `notes` | Observaciones del entrenador |

### Sede en sesiones

El campo `location` se puebla desde las claves del JSON `club.zonePrices`. Si el club no tiene `zonePrices`, el selector de sede no aparece. Esto permite que clubs multi-sede (como BallBreakers: SUR, CENTRO, NORTE) distingan dónde se hace cada sesión — relevante porque cada sede tiene horarios y grupos distintos.

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
- Alertar al admin si hay sesiones programadas sin asistencia registrada
- Detectar jugadores con múltiples ausencias y notificar al coach

Ver también: [[Gamificación]] | [[Tareas Automatizables]]
