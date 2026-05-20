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

## Para un padre que necesita resetear su acceso (flujo principal Ball Breakers)

Aplica a cualquier padre con `setupCompleted = false` o cuando Karen hace un reset.

```
Karen va a Admin → Acudientes (o al perfil del jugador)
    ↓
Clic en "Resetear al documento del hijo"
    ↓
Sistema: password = hash(documentNumber del hijo) + setupCompleted = false
    ↓
Karen le dice al padre: "Tu usuario y clave es el documento de [nombre del hijo]"
    ↓
Padre entra al login escribiendo el documento del hijo (sin @) como usuario y clave
    ↓
Auth.ts lo encuentra por 3 fallbacks (ver abajo)
    ↓
Middleware detecta setupCompleted = false → redirige a /dashboard/parent/setup
    ↓
Padre ve formulario:
  - Correo electrónico real
  - Nueva contraseña
  - Lista de jugadores del club (buscable, checkboxes) — hijo pre-marcado
    ↓
Al guardar:
  - Email y contraseña se actualizan en DB
  - Vínculos ParentPlayer se re-crean con la selección
  - setupCompleted = true
  - Re-login automático con las nuevas credenciales
    ↓
Padre entra a su dashboard — nunca más ve /setup
```

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
- Botón "Resetear al documento del hijo" por cada padre
- Generador de invitaciones para padres nuevos

## Formato de emails internos (migración Ball Breakers)

| Formato | Cuándo se usa |
|---|---|
| `{doc_hijo}@bb.internal` | Padres migrados — el doc del hijo se usó como email |
| `{doc_hijo}@acudiente.bb.internal` | Cuando el doc ya existía como otro usuario |

Estos padres pueden entrar directamente con el doc del hijo (fallback 2 los encuentra).

---

Ver también: [[Roles y Permisos]] | [[Ciclo de Pagos]]
