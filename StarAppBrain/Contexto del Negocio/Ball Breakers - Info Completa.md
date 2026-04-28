# Ball Breakers — Info Completa

← [[000 - Inicio]] | [[Modelo de Negocio SaaS]] | [[Ciclo de Pagos]]

Ball Breakers es un cliente SaaS de StarApp. Club de voleibol en Barranquilla con configuración más compleja que Star Club: múltiples sedes, precios por zona, ciclo de pago configurable y descuento por pronto pago.

---

## Datos generales

| Campo | Valor |
|---|---|
| Club ID en sistema | `ball-breakers` |
| Slug | `ball-breakers` |
| Deporte | Voleibol 🏐 |
| Plan | ENTERPRISE |
| Ciudad | Barranquilla, Colombia |
| Admin | Karen (perfil ADMIN) |

---

## Ciclo de Pagos

| Concepto | Valor |
|---|---|
| Inicio de ciclo (`billingCycleDay`) | Día **15** de cada mes |
| Fin de ciclo | Día **14** del mes siguiente |
| Ventana de descuento (`earlyPaymentDays`) | Primeros **5** días del ciclo (días **15–20**) |
| Descuento por pago anticipado (`earlyPaymentDiscount`) | **$10.000 COP** |

### Flujo del ciclo

```
Día 15 del mes → inicia el nuevo ciclo
  ↓
Días 15 al 20 → ventana de pronto pago
  El padre paga → $10.000 de descuento
  Ej: Norte ($100k) → cobra $90k

Días 21 al 14 del mes siguiente → precio normal sin descuento

Día 14 del mes siguiente → fin del ciclo, pago se marca OVERDUE si no pagó
```

### Tarifas por sede (`zonePrices`)

| Sede | Precio normal | Con descuento |
|---|---|---|
| Sur (`SUR`) | $80.000 | $70.000 |
| Centro (`CENTRO`) | $90.000 | $80.000 |
| Norte (`NORTE`) | $100.000 | $90.000 |

---

## Sedes

- Sede Sur
- Sede Centro
- Sede Norte

---

## Categorías (separadas por género)

| Categoría | Género | Edad |
|---|---|---|
| Voley Kid F | Femenino | 4–9 años |
| Voley Kid M | Masculino | 4–9 años |
| Mini Voley F | Femenino | 10–12 años |
| Mini Voley M | Masculino | 10–12 años |
| Infantil F | Femenino | 13–14 años |
| Infantil M | Masculino | 10–14 años |
| Menores F | Femenino | 15–17 años |
| Menores M | Masculino | 15–17 años |
| Juvenil F | Femenino | 18–21 años |
| Juvenil M | Masculino | 18–21 años |

> Ball Breakers usa `player.gender = "F" | "M"` en todos sus jugadores. Esto activa las tabs de género en `/admin/players` (solo visibles cuando `genderedCount > 0`). Star Club tiene `gender = null` (no le aplica).

---

## Posiciones de Voleibol

Punta · Central · Líbero · Armador · Opuesto

---

## Acceso de usuarios

| Rol | Email | Contraseña |
|---|---|---|
| Jugador | `{documento}@bb.internal` | documento |
| Tutor/Padre | email de contacto del formulario | documento del jugador |

---

## Estado actual (Abril 2026)

- 64 jugadores importados desde base de datos de formulario Google
- Todos con pago OVERDUE del ciclo 15 abr – 14 may 2026
- El admin (Karen) va marcando pagos a medida que los padres cancelan
- Al marcar un pago como pagado, el sistema auto-genera el siguiente ciclo

### Notas de la importación

- 2 jugadores sin número de documento real (Kyran Arias, María Alejandra Rodriguez) → doc ficticio `TIKYRANARIAS2011` y `TIMARIARODRIGUEZ2012`
- Aileen Sánchez tenía documento `000000` → corregido a `000000AILEEN`
- DOB de Salomé Meza tenía año 2026 (error tipeo) → corregido a 2016
- Pesos/alturas normalizados (metros → cm, string → float)

---

## Por qué este club es importante para el SaaS

Ball Breakers ilustra que el sistema es **completamente flexible**:
- Categorías por género (Star Club no usa género)
- Precios por zona geográfica dentro del mismo club
- Ciclos de pago configurables (no día 1 del mes)
- Descuentos por pronto pago configurables
- Tabla de géneros activa solo cuando `genderedCount > 0` (multi-tenant limpio)

La IA debe respetar la configuración de **cada club por separado** y nunca asumir que todos funcionan igual que Star Club.

---

Ver también: [[Schema Completo]] → `Club.zonePrices`, `billingCycleDay`, `earlyPaymentDays`, `coachCanInvite` | [[Ciclo de Pagos]] | [[Roles y Permisos]] | [[Star Club - Info Completa]]
