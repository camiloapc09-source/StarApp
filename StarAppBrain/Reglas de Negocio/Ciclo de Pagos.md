# Ciclo de Pagos

← [[000 - Inicio]] | [[Schema Completo]]

---

## Cómo funciona el cobro mensual

Cada club configura en su perfil:
- `billingCycleDay` → qué día del mes empieza el nuevo periodo (ej: día 1)
- `earlyPaymentDays` → cuántos días después del inicio aplica descuento por pago anticipado
- `earlyPaymentDiscount` → valor del descuento en COP

Cada jugador puede tener:
- `paymentDay` → su día personal de pago (override al del club)
- `monthlyAmount` → su cuota personalizada (override al precio de su zona)
- `zone` → zona geográfica que mapea a `Club.zonePrices` (si el club usa precios por zona)

### Flujo completo de un pago

```
1. Admin crea el Payment (o se genera automáticamente)
   status: PENDING, dueDate: fecha límite

2. Jugador / Padre ve el cobro en su panel
   → Sube comprobante de transferencia
   status: SUBMITTED, proofUrl: archivo subido

3. Admin revisa el comprobante
   → CONFIRMA: status: COMPLETED, paidAt: now
   → RECHAZA: status: PENDING de nuevo (con nota de rechazo)

4. Si llega la dueDate sin pagar:
   → Cron job llama POST /api/payments/mark-overdue
   status: OVERDUE
```

### Prioridad de monto mensual

```
1. Player.monthlyAmount (personalizado) → usa ese
2. Club.zonePrices[player.zone] → usa el precio de su zona
3. Sin configurar → el admin lo pone manualmente
```

### Exportación

El admin puede exportar todos los pagos a CSV desde `/api/admin/payments/export`.

---

## Tareas pendientes para IA

La IA puede automatizar:
- [ ] Generar pagos del mes nuevo automáticamente el día del ciclo
- [ ] Notificar jugadores cuando su pago está próximo a vencer (3 días antes)
- [ ] Marcar OVERDUE cada noche (el endpoint ya existe: `POST /api/payments/mark-overdue`)
- [ ] Enviar recordatorio a padres que tienen pagos SUBMITTED sin confirmar hace +48h
- [ ] Reporte semanal al admin con estado de cartera

Ver también: [[Tareas Automatizables]] | [[Notificaciones y Push]]
