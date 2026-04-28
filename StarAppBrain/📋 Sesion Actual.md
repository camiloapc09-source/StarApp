# 📋 Sesión Actual

> **Memoria a corto plazo.** Claude lee este archivo al inicio de cada conversación para saber dónde quedó. Lo actualiza al final (o durante) la sesión. Cuando una tarea ya no es relevante, se borra de aquí — solo queda lo que importa ahora.

---

## ✅ Completado (esta sesión / reciente)

| Tarea | Commit | Estado |
|---|---|---|
| Permiso `coachCanInvite` — toggle settings + API + página coach | `1cfe3c5` | ✅ En deploy |
| Mensaje de cobro humanizado + ventana pronto pago Ball Breakers | `1cfe3c5` | ✅ En deploy |
| Comprobante padre → "Compartir por WhatsApp" (html2canvas) | `1cfe3c5` | ✅ En deploy |
| Fix gender tabs multi-tenant (solo clubs con `genderedCount > 0`) | `1cfe3c5` | ✅ En deploy |
| Vault Obsidian: consolidar archivos duplicados BallBreakers | — | ✅ Listo |
| **Fix crítico**: `prisma db push` en build script — DB se sincroniza sola en cada deploy | `92320ed` | ✅ Producción |

---

## 🔜 Pendientes

| Tarea | Prioridad | Notas |
|---|---|---|
| Landing page / website para StarApp | Alta | Necesaria para verificación de Meta (WhatsApp Business API) |
| WhatsApp IA para cobros (asistente de cobranza) | Alta | Bloqueado por verificación Meta |
| VAPID_EMAIL en Render → cambiar a email starshine | Baja | Actualmente usa email personal |

---

## 🧠 Contexto relevante para próxima sesión

### Multi-tenancy y género

- `Player.gender` es `String?` (nullable). Star Club → `null`. Ball Breakers → `"F" | "M"`.
- Lista de jugadores: hace `db.player.count({ where: { clubId, gender: { not: null } } })` ANTES del resto de queries. Solo aplica filtro de género y muestra tabs si `genderedCount > 0`. Multi-tenant limpio.

### coachCanInvite

- `coachCanInvite Boolean @default(false)` en schema `Club`.
- Toggle en Settings admin → card "Permisos de entrenadores".
- API `POST /api/coach/invites` — solo PLAYER role, verifica el flag.
- Página `/dashboard/coach/invites` — si flag desactivado muestra pantalla con candado.
- `NewInviteForm` tiene prop opcional `endpoint` (default `/api/invites`). Coach page usa `/api/coach/invites`.
- Sidebar: `UserPlus` icon en nav del coach.
- ✅ Ya no necesario: `package.json` build script ahora corre `prisma db push --accept-data-loss` automáticamente en cada deploy.

### Mensaje de cobro

- `BulkMarkReceivedPanel` recibe: `billingCycleDay`, `earlyPaymentDays`, `earlyPaymentDiscount`, `clubName`.
- `getColombiaDay()` calcula el día actual en zona Colombia.
- Si `colombiaDay` entre `billingCycleDay` y `billingCycleDay + earlyPaymentDays` → agrega línea de descuento.
- Star Club (descuento = 0) → línea nunca aparece.

### Vault Obsidian

- Nota canónica: `Ball Breakers - Info Completa.md` (con espacio, conectada al grafo).
- `BallBreakers - Info Completa.md` (sin espacio) → solo redirect, no borrar o Obsidian rompe los backlinks internos que tenga.

---

## 📌 Reglas de esta memoria

- Cuando termines algo → muévelo a "Completado" con el commit
- Cuando algo en "Completado" ya sea viejo y esté en producción estable → bórralo de aquí
- Solo agregar a pendientes cosas que el usuario pidió pero aún no se hicieron
