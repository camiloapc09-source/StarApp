# Notificaciones y Push

← [[000 - Inicio]] | [[Schema Completo]]

---

## Dos capas de notificaciones

### 1. Notificaciones en app (base de datos)

Modelo `Notification` → aparece en el panel del usuario.

| Tipo | Cuándo se usa |
|---|---|
| `INFO` | Mensaje general |
| `ALERT` | Algo urgente |
| `ACHIEVEMENT` | Subió de nivel, completó misión |
| `PAYMENT` | Cobro próximo, vencido, confirmado |
| `ATTENDANCE` | Recordatorio de sesión |

Endpoint: `POST /api/notifications`

### 2. Push Notifications (Web Push / VAPID)

Llegan al dispositivo aunque el jugador no tenga la app abierta. Funcionan en móvil y desktop.

```
1. Jugador activa las notificaciones en su perfil
2. Browser registra la suscripción (endpoint + claves p256dh + auth)
3. POST /api/push guarda la PushSubscription en DB
4. El servidor puede enviar push en cualquier momento usando las claves VAPID
```

### 3. Email (Resend)

Para comunicaciones formales:
- Bienvenida al registrarse
- Recordatorio de pago vencido
- Confirmación de pago recibido

---

## Flujo recomendado para notificaciones importantes

```
Evento ocurre (pago vencido, sesión mañana, etc.)
    ↓
Crear Notification en DB (aparece en el panel)
    ↓
Si el usuario tiene PushSubscription → enviar Web Push
    ↓
Si el evento es crítico → enviar Email via Resend
```

---

## Para la IA Admin

La IA puede enviar notificaciones llamando:
- `POST /api/notifications` con el userId y el mensaje
- El sistema de push ya está conectado — solo necesita un trigger

Ver también: [[Ciclo de Pagos]] | [[Tareas Automatizables]]
