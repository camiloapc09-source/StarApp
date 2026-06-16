# Becas

← [[000 - Inicio]] | [[Ciclo de Pagos]] | [[Ball Breakers - Info Completa]]

---

## Qué es una beca

Una beca es un descuento porcentual aplicado a la mensualidad de un jugador. Puede ser parcial (cualquier % entre 1 y 100) o total (100% = sin costo).

---

## Modelo en DB

```prisma
model Player {
  scholarshipPct Int?   // 1-100 — porcentaje de beca; null = sin beca
  monthlyAmount  Float? // monto resultante después de aplicar la beca
}
```

No hay tabla separada para becas — todo está en el modelo `Player`.

---

## Cómo se calcula el monto

```
monthlyAmount = round(precioZona × (scholarshipPct / 100))

Ejemplos con Norte ($100.000):
  scholarshipPct = 50  → monthlyAmount = $50.000
  scholarshipPct = 30  → monthlyAmount = $30.000
  scholarshipPct = 75  → monthlyAmount = $75.000
  scholarshipPct = 100 → monthlyAmount = $0
```

Si el jugador no tiene zona configurada, el admin puede ajustar `monthlyAmount` manualmente.

---

## Cómo se aplica (flujo admin)

1. Admin abre el modal de edición del jugador (botón "Editar" en `/admin/players/[id]`)
2. En la sección BECA:
   - Botones rápidos: **Sin beca** · **50%** · **100%**
   - Input editable (1–100) que aparece cuando hay beca activa — permite cualquier porcentaje
   - Al cambiar el %, el monto se recalcula automáticamente si hay zona configurada
3. Al guardar → PATCH `/api/players/{id}` con `{ scholarshipPct, monthlyAmount }`

**Archivo:** `src/components/admin/admin-edit-player-button.tsx`

---

## API

`PATCH /api/players/[id]`

```ts
scholarshipPct: z.number().int().min(1).max(100).optional().nullable()
```

`null` = sin beca. Cualquier entero de 1 a 100 es válido.

**Archivo:** `src/app/api/players/[id]/route.ts`

---

## Beca 100% cancela la deuda abierta (desde 2026-06-16)

La generación masiva de pagos (`PUT /api/payments`) **ya saltaba** a los jugadores con `scholarshipPct === 100` — pero si a un jugador se le marcaba beca total **después** de que ya tenía cobros generados, esos cobros quedaban vivos (deuda fantasma). Ese era el caso de Julian: aparecía con 3 mensualidades de $80.000 a pesar de estar becado.

**Solución:** al hacer `PATCH /api/players/[id]` con `scholarshipPct === 100`, se borran automáticamente los pagos del jugador en estado `PENDING`, `OVERDUE` y `SUBMITTED`. Los pagos `COMPLETED` se conservan como historial. La respuesta incluye `canceledPayments` (cuántos se borraron).

```ts
if (parsed.data.scholarshipPct === 100) {
  await db.payment.deleteMany({
    where: { playerId: id, status: { in: ["PENDING", "OVERDUE", "SUBMITTED"] } },
  });
}
```

Las becas **parciales** (50%, 75%, etc.) siguen generando cobro con el descuento aplicado — solo el 100% limpia la deuda.

---

## Display en player detail

En `/dashboard/admin/players/[id]`, el badge muestra el porcentaje real:

```
BECA 30%   BECA 75%   BECA 100%
```

(Antes del 2026-05-03 solo mostraba "BECA 50%" o "BECA 100%" hardcodeado.)

---

## Activación inicial (onboarding del jugador)

Al activar un jugador desde el panel admin (`PlayerActivateButton`), hay un checkbox "Beca (mensualidad $0)" que aplica beca completa (100%). Para becas parciales, el admin debe editar el jugador después de activarlo.

---

## Becas en Ball Breakers

Karen (admin de Ball Breakers) usa becas para algunos jugadores. A partir del 2026-05-03 puede asignar cualquier porcentaje — antes estaba limitada a 50% o 100%.

Ver también: [[Ciclo de Pagos]] | [[Ball Breakers - Info Completa]] | [[Schema Completo]]
