# Roles y Permisos

← [[000 - Inicio]]

---

## Roles del sistema

| Rol | Quién es | Acceso |
|---|---|---|
| `SUPERADMIN` | Tú (dueño de StarApp) | Todo el sistema, todos los clubes |
| `ADMIN` | Administrador del club | Todo dentro de su club |
| `COACH` | Entrenador | Ver jugadores de su categoría, registrar asistencia, notas, participar en rifas. Puede solicitar perfil de jugador (doble rol). |
| `PLAYER` | Jugador | Ver su propio perfil, pagos, misiones |
| `PARENT` | Padre / madre | Ver el perfil de sus hijos, pagar, pedir uniformes |

## Jerarquía de acceso

```
SUPERADMIN
  └─ ADMIN (por club)
       ├─ COACH
       ├─ PLAYER
       └─ PARENT
```

## Reglas clave

- Un `COACH` solo ve jugadores de la categoría asignada (`coachCategoryId` o `coachCategoryIds`)
- Un `PARENT` solo puede ver los jugadores vinculados en `ParentPlayer`
- Todos los datos están aislados por `clubId` — un admin de Club A nunca toca datos de Club B
- El `SUPERADMIN` accede via `/superadmin/` (rutas separadas)

## Doble rol: Entrenador + Jugador

Un COACH puede tener también un perfil de jugador (Player). Flujo:

1. Coach solicita desde su dashboard → botón "Solicitar perfil de jugador"
2. Admin recibe notificación y ve la solicitud en la lista de entrenadores
3. Admin aprueba → `POST /api/admin/coaches/player-profile` crea un Player con `paymentExempt: true`
4. Coach hace re-login → `linkedPlayerId` queda en su sesión JWT
5. Dashboard del coach muestra "Cambiar a Jugador" → navega a `/dashboard/player`
6. En páginas de jugador aparece banner "Modo Jugador activo · Volver a Entrenador"

### Reglas del coach-jugador
- `Player.paymentExempt = true` → excluido de la generación de mensualidades
- La cuenta usa el mismo email y clave (mismo User, mismo `userId`)
- El Admin puede quitar el perfil de jugador desde la lista de entrenadores
- El Admin puede convertir un jugador en entrenador cambiando `User.role` (funcionalidad en gestión de jugadores)

## Flujo de registro de un nuevo jugador

```
1. Admin crea código de invitación (POST /api/invites)
   → role: PLAYER, expiresAt, payload con datos previos

2. Jugador recibe el enlace y se registra (POST /api/invites/redeem)
   → Se crea User + Player automáticamente

3. Admin activa el jugador (cambia Player.status a ACTIVE)
```

## Flujo de registro de un nuevo club (SaaS)

```
1. Tú (SUPERADMIN) creas un AccessCode (POST /api/superadmin/access-codes)
   → plan: STARTER | PRO | ENTERPRISE

2. El admin del club nuevo va a /register y usa el código
   → Se crea el Club + el primer usuario ADMIN

3. Admin llama POST /api/admin/bootstrap para inicializar datos por defecto
```

---

Ver también: [[Flujo de Onboarding]] | [[Rutas API]]
