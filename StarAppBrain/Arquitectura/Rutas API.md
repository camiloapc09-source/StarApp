# Rutas API

← [[000 - Inicio]] | [[Stack Tecnológico]]

Todos los endpoints viven en `/api/`. Requieren sesión autenticada salvo los de auth.

---

## Auth

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/[...nextauth]` | Login / sesión NextAuth |
| POST | `/api/auth/signout` | Logout |

## Jugadores

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/players` | Listar / crear jugadores |
| GET/PATCH/DELETE | `/api/players/[id]` | Ver / editar / eliminar jugador |

## Sesiones y Asistencia

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/sessions` | Listar / crear sesiones |
| GET/PATCH/DELETE | `/api/sessions/[id]` | Ver / editar / eliminar sesión |
| POST | `/api/attendance` | Registrar asistencia en masa |

## Pagos

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/payments` | Listar / crear pagos |
| GET/PATCH | `/api/payments/[id]` | Ver / actualizar pago |
| POST | `/api/payments/[id]/submit` | Jugador sube comprobante |
| POST | `/api/payments/[id]/upload` | Subir archivo de prueba |
| POST | `/api/payments/[id]/reject` | Admin rechaza pago |
| POST | `/api/payments/mark-overdue` | Marcar pagos vencidos (cron) |

## Categorías

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/categories` | Listar / crear categorías |
| GET/PATCH/DELETE | `/api/categories/[id]` | Ver / editar / eliminar categoría |

## Gamificación

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/gamification` | Estado XP / nivel / streak del jugador |
| GET/POST | `/api/missions` | Listar / crear misiones |
| POST | `/api/missions/generate` | Generar misiones automáticas |
| GET/PATCH/DELETE | `/api/missions/[id]` | Ver / editar / eliminar misión |
| GET/POST | `/api/rewards` | Listar / crear recompensas |
| GET/PATCH/DELETE | `/api/rewards/[id]` | Gestionar recompensa |
| POST | `/api/evidence` | Subir evidencia de misión |

## Notificaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/notifications` | Leer / crear notificaciones |
| POST | `/api/push` | Registrar suscripción push |

## Invitaciones

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/invites` | Listar / crear códigos de invitación |
| POST | `/api/invites/redeem` | Canjear invitación |

## Admin (solo ADMIN del club)

| Método | Ruta | Descripción |
|---|---|---|
| GET/PATCH | `/api/admin/club` | Ver / actualizar config del club |
| POST | `/api/admin/bootstrap` | Inicializar club nuevo |
| POST | `/api/admin/avatar-review` | Aprobar / rechazar foto de avatar |
| GET/POST | `/api/admin/users` | Gestionar usuarios |
| PATCH/DELETE | `/api/admin/users/[id]` | Editar / eliminar usuario |
| POST | `/api/admin/payments/bulk-confirm` | Confirmar pagos en lote |
| GET | `/api/admin/payments/export` | Exportar pagos CSV |
| POST | `/api/admin/players/notes` | Notas de entrenador |
| POST | `/api/admin/players/reset-password` | Resetear contraseña de jugador |
| GET | `/api/admin/uniforms/export` | Exportar pedidos de uniformes |

## Perfil

| Método | Ruta | Descripción |
|---|---|---|
| GET/PATCH | `/api/profile` | Ver / editar perfil propio |
| POST | `/api/profile/avatar` | Subir foto de avatar |
| POST | `/api/profile/change-password` | Cambiar contraseña |

## Reportes

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/reports` | Reportes del club |
| GET | `/api/reports/export` | Exportar reporte |

## Uniformes

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/api/uniforms` | Listar / crear pedidos de uniformes |
| GET/PATCH | `/api/uniforms/[id]` | Ver / actualizar pedido |

## Clubes y Acceso (SaaS)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/clubs` | Crear nuevo club (con código de acceso) |
| GET/POST | `/api/access-codes` | Códigos de acceso del club |

## Superadmin (solo StarApp)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/superadmin/clubs` | Ver todos los clubes |
| GET/POST | `/api/superadmin/access-codes` | Gestionar códigos de acceso SaaS |

---

Ver también: [[Schema Completo]] | [[Roles y Permisos]]
