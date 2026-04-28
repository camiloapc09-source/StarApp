# Tareas Automatizables

← [[000 - Inicio]] | [[Vision y Roadmap IA]]

Lista de todo lo que la IA puede hacer en StarApp sin que el admin lo haga manualmente.

---

## Tareas de pago (alta prioridad)

| Tarea | Frecuencia | API | Riesgo |
|---|---|---|---|
| Marcar pagos OVERDUE que superaron dueDate | Diario (noche) | `POST /api/payments/mark-overdue` | Bajo |
| Notificar jugador 3 días antes de vencer | Diario | `POST /api/notifications` | Bajo |
| Recordar a padre que su comprobante lleva +48h sin confirmar | Diario | `POST /api/notifications` | Bajo |
| Generar los pagos del mes nuevo el día del ciclo | Mensual | `POST /api/payments` | Medio |
| Reporte semanal de cartera al admin | Semanal | `GET /api/payments` + email | Bajo |

## Tareas de sesiones

| Tarea | Frecuencia | API | Riesgo |
|---|---|---|---|
| Crear sesiones recurrentes automáticamente | Semanal | `POST /api/sessions` | Medio |
| Recordatorio de sesión mañana | Diario | `POST /api/notifications` | Bajo |
| Alertar si hay sesión sin asistencia registrada después de 2h | Tras cada sesión | Lógica + notificación | Bajo |

## Tareas de jugadores

| Tarea | Frecuencia | API | Riesgo |
|---|---|---|---|
| Detectar jugadores inactivos (+30 días sin asistencia) | Semanal | `GET /api/players` + notificación | Bajo |
| Generar misiones personalizadas | Semanal | `POST /api/missions/generate` | Bajo |
| Notificar cuando un jugador sube de nivel | En tiempo real | `POST /api/notifications` | Bajo |
| Revisar evidencias pendientes y recordar al admin | Diario | `GET /api/evidence` | Bajo |

## Tareas de administración

| Tarea | Frecuencia | API | Riesgo |
|---|---|---|---|
| Revisar avatares pendientes de aprobación | Diario | `POST /api/admin/avatar-review` | Bajo |
| Limpiar invitaciones expiradas | Semanal | DB / `GET /api/invites` | Bajo |
| Reporte mensual del club (asistencia, pagos, top jugadores) | Mensual | `GET /api/reports` | Bajo |

---

## Clasificación por riesgo

### 🟢 Bajo riesgo (IA ejecuta sola)
- Enviar notificaciones
- Marcar pagos OVERDUE
- Generar reportes
- Recordatorios

### 🟡 Riesgo medio (IA propone, admin aprueba)
- Crear pagos nuevos del mes
- Crear sesiones recurrentes
- Cambiar estado de jugadores

### 🔴 Alto riesgo (siempre con aprobación explícita)
- Eliminar usuarios o jugadores
- Cambiar montos de cuotas
- Eliminar sesiones pasadas

---

Ver también: [[Protocolo de Decisiones]] | [[Ciclo de Pagos]]
