# Rifas

← [[000 - Inicio]] | [[Rutas API]]

---

## ¿Qué es?

Módulo de rifas de 100 números (00–99) que el admin crea para el club. Los padres **y entrenadores** reservan números, suben comprobante de pago, y el admin verifica. Funciona de forma completamente independiente entre clubes (multi-tenant por `clubId`).

---

## Modelos Prisma

```prisma
model Raffle {
  id          String   // cuid
  clubId      String   // tenant FK → Club
  title       String
  description String?
  prize       String?  // qué se está rifando
  ticketPrice Float    // valor por número
  status      String   // OPEN | CLOSED | FINISHED
  drawDate    DateTime?
  tickets     RaffleTicket[]
}

model RaffleTicket {
  id           String
  raffleId     String   // FK → Raffle (cascade delete)
  number       Int      // 0-99
  takenById    String?  // userId del padre, entrenador o jugador
  ownerName    String?  // nombre para mostrar
  status       String   // TAKEN | PAID | CANCELLED
  proofUrl     String?  // base64 del comprobante
  takenAt      DateTime
  paidAt       DateTime?
  verifiedById String?  // userId del admin que verificó
  @@unique([raffleId, number])
}
```

---

## Flujo completo

```
Admin crea rifa (título, premio, precio/número, fecha sorteo)
        ↓
Padre o Entrenador entra a su /rifas → ve cartón 10×10 (00-99)
        ↓
Usuario toca número libre → queda en TAKEN
        ↓
Usuario sube comprobante de pago (imagen JPG/PNG/WEBP, max 5MB)
        ↓
Admin ve en /admin/rifas/[id] → cartón con colores
        ↓
Admin toca número amarillo → puede "Marcar pagado" → PAID (verde)
        ↓
(opcional) Admin puede revertir PAID → TAKEN, o liberar número TAKEN → libre
```

---

## Colores del cartón (vista padre / entrenador)

| Estado | Visual | Descripción |
|---|---|---|
| Libre | Gris tenue | Disponible para tomar |
| Reservado (otro) | Rayas diagonales doradas | Tomado por otra persona |
| Mío (TAKEN) | Morado | Mi número, pendiente de pago |
| Mío (PAID) | Verde brillante | Mi número ya verificado |
| Seleccionado | Morado intenso | Seleccionado para reservar |

---

## Colores del cartón (vista admin)

| Estado | Color | Descripción |
|---|---|---|
| Libre | Gris tenue | Disponible |
| TAKEN | Amarillo | Reservado, pendiente de pago |
| PAID | Verde | Pagado y verificado |

---

## Estados de la Rifa

| Estado | Significado |
|---|---|
| `OPEN` | Abierta, se pueden tomar números |
| `CLOSED` | Cerrada, no se pueden tomar más números |
| `FINISHED` | Sorteo realizado, se mueve al historial |

Transición: OPEN → CLOSED → FINISHED (solo admin, desde el botón en la UI)

---

## Rutas API

| Método | Ruta | Roles permitidos | Descripción |
|---|---|---|---|
| GET/POST | `/api/rifas` | Autenticado | Listar / crear rifas del club |
| GET/PUT/DELETE | `/api/rifas/[id]` | Autenticado / ADMIN | Ver / actualizar / eliminar |
| POST | `/api/rifas/[id]/tickets` | Autenticado | Reclamar uno o más números |
| POST | `/api/rifas/[id]/tickets/[num]/upload` | PARENT, PLAYER, COACH, ADMIN | Subir comprobante de pago |
| POST | `/api/rifas/[id]/tickets/[num]/verify` | ADMIN | Marcar como PAID |
| DELETE | `/api/rifas/[id]/tickets/[num]/verify` | ADMIN | Revertir a TAKEN |
| DELETE | `/api/rifas/[id]/tickets/[num]/release` | PARENT, PLAYER, COACH, ADMIN | Liberar número (owner o admin) |

---

## Páginas

| Ruta | Rol | Descripción |
|---|---|---|
| `/dashboard/admin/rifas` | ADMIN | Lista de rifas + stats + crear |
| `/dashboard/admin/rifas/[id]` | ADMIN | Cartón completo + lista de participantes |
| `/dashboard/parent/rifas` | PARENT | Cartón para elegir y gestionar mis números |
| `/dashboard/coach/rifas` | COACH | Cartón para elegir y gestionar mis números |

---

## Reglas de negocio

- Solo 1 ticket por número por rifa (unique en DB)
- Solo el dueño del ticket o un ADMIN puede liberar un número
- No se puede liberar un número en estado PAID
- Rifa debe estar OPEN para que se puedan tomar números
- Comprobante: solo imágenes JPG/PNG/WEBP, máx 5MB, guardado como base64 en DB
- El logo del club se muestra en el encabezado del cartón
- Multi-tenant: siempre filtrado por `clubId` del token de sesión
- COACH y PARENT comparten el mismo componente `RafflePickForm`

---

## Navegación

- **Sidebar admin**: con ícono `Ticket`
- **Sidebar coach**: con ícono `Ticket` (entre Misiones y Reportes)
- **Sidebar parent**: con ícono `Ticket`
- **Bottom-nav admin**: en el panel "Más opciones" con color morado
- **Bottom-nav coach**: en el panel "Más opciones" con color morado
- **Bottom-nav parent**: tab visible con ícono de ticket

---

Ver también: [[Pagos y Facturación]] | [[Roles y Permisos]] | [[Rutas API]]
