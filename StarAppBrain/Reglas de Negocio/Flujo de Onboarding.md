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

## Para un padre nuevo

```
Jugador ya existe en el sistema
    ↓
Admin genera Invite con role=PARENT
    ↓
Padre se registra con el enlace
    ↓
Se crea User(PARENT) + Parent, vinculado al Player
    ↓
Padre puede ver pagos, subir comprobantes, pedir uniformes
```

---

Ver también: [[Roles y Permisos]] | [[Ciclo de Pagos]]
