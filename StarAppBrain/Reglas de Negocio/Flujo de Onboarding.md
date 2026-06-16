# Flujo de Onboarding

← [[000 - Inicio]] | [[Roles y Permisos]]

---

## Para un club nuevo

```
SUPERADMIN genera AccessCode (plan: STARTER/PRO/ENTERPRISE)
    ↓
Le pasa el código al admin del club (WhatsApp, email, etc.)
    ↓
Admin va a starapp.com/register → ingresa el código
    ↓
Se crea Club + User(ADMIN) en la DB
    ↓
Admin llama /api/admin/bootstrap → se inicializan:
  - Categorías por defecto
  - Misiones básicas
  - Configuración de pagos
    ↓
Admin configura:
  - billingCycleDay, earlyPaymentDays, earlyPaymentDiscount
  - zonePrices (si el club usa zonas)
  - Logo, ciudad, deporte
    ↓
Admin crea categorías (Sub-8, Sub-12, Sub-15, etc.)
    ↓
Admin invita jugadores (genera códigos de invitación por categoría)
    ↓
¡Club operativo!
```

## Para un jugador nuevo

```
Admin genera Invite con role=PLAYER y datos opcionales (nombre, categoría)
    ↓
Comparte el enlace con el padre/jugador
    ↓
Jugador va al enlace → completa registro → canjea invitación
    ↓
Se crea User(PLAYER) + Player con status=PENDING
    ↓
Admin activa al jugador (ACTIVE) y le asigna categoría definitiva
    ↓
Si tiene padre: Admin o el mismo padre vincula la cuenta Parent → Player
```

## Para un padre nuevo (invite)

```
Jugador ya existe en el sistema
    ↓
Admin genera Invite con role=PARENT desde el perfil del jugador
    ↓
Padre abre el enlace → rellena correo + contraseña
  → Puede agregar cédulas de hijos adicionales (campo dinámico)
    ↓
Se crea User(PARENT) + Parent + vínculos ParentPlayer
setupCompleted = true (configuró su propia cuenta)
    ↓
Padre entra directo a su dashboard
```

## Reseteo MASIVO de acudientes (flujo principal Ball Breakers, desde 2026-06-16)

> **Por qué existe:** al arrancar la app se usó el *documento del hijo como CONTRASEÑA*. Para un padre con 2 hijos eso era ambiguo (¿qué documento?). La solución: el documento del hijo es el **USUARIO** (cualquiera de los dos sirve) y la **clave** pasa a ser fija y temporal `123456789`. Así el mensaje es idéntico para todos y funciona incluso para padres con email roto (`@…internal`).

```
Karen va a Admin → Acudientes → botón "Resetear N sin configurar"
    ↓
POST /api/admin/parents/bulk-reset
  → todos los PARENT con setupCompleted=false reciben password=hash("123456789")
  → los 21 que YA configuraron NO se tocan
    ↓
El modal genera UN mensaje para pegar en el grupo de WhatsApp:
  "Usuario: documento del hijo · Clave: 123456789 · luego cambia clave y vincula hijos"
    ↓
Padre entra con el documento del hijo (sin @) como usuario + clave 123456789
    ↓
Auth.ts lo encuentra por el fallback de documento (ver abajo)
    ↓
setupCompleted=false → banner "Estás usando una clave temporal" (NO redirige forzado)
    ↓
Padre va a /dashboard/parent/setup:
  - Correo electrónico real
  - Nueva contraseña
  - Lista de jugadores del club (buscable, checkboxes) — vincula TODOS sus hijos
    ↓
Al guardar: email + password actualizados, vínculos ParentPlayer re-creados, setupCompleted=true
```

**Archivos:** `api/admin/parents/bulk-reset/route.ts` · `components/admin/bulk-reset-parents-button.tsx` · `components/parent/setup-banner.tsx`

### Reset individual (sigue existiendo)

Desde el perfil del jugador o el panel de acudientes, "Resetear contraseña" sigue disponible para casos puntuales (resetea al documento del hijo o a una clave aleatoria). Ver `api/admin/players/reset-password/route.ts`.

> ⚠️ **Importante:** el middleware **ya NO redirige** forzado a `/setup`. La configuración es voluntaria (banner). El redirect forzado se quitó porque rompía el login de cuentas seeded que nunca pasaron por setup. Ver `src/middleware.ts:42`.

## Fallbacks de autenticación (auth.ts)

Cuando el input no contiene `@`, se intenta en orden:

1. **Email directo**: busca usuario con `email = input`
2. **@bb.internal**: busca `{input}@bb.internal` o `{input}@acudiente.bb.internal` (migración antigua)
3. **Documento del hijo** *(nuevo)*: busca padre via `ParentPlayer.player.documentNumber = input`

El tercer fallback cubre padres con email real (no @bb.internal) cuyos hijos tienen el documento registrado.

## Panel de Acudientes (Admin → Acudientes)

- Lista todos los padres del club con sus hijos vinculados
- Muestra documento del hijo, categoría, pagos pendientes
- Chip amarillo "Sin configurar" si `setupCompleted = false`
- **Botón "Resetear N sin configurar"** (masivo, clave temporal `123456789`) en el banner amarillo
- Botón "Resetear contraseña" individual por cada padre
- Generador de invitaciones para padres nuevos

## Formato de emails internos (migración Ball Breakers)

| Formato | Cuándo se usa |
|---|---|
| `{doc_hijo}@bb.internal` | Padres migrados — el doc del hijo se usó como email |
| `{doc_hijo}@acudiente.bb.internal` | Cuando el doc ya existía como otro usuario |

Estos padres pueden entrar directamente con el doc del hijo (fallback 2 los encuentra).

---

Ver también: [[Roles y Permisos]] | [[Ciclo de Pagos]]
