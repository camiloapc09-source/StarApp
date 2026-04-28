# Schema de Base de Datos

← [[000 - Inicio]] | [[Stack Tecnológico]]

Base: PostgreSQL (Neon). ORM: Prisma. Todos los modelos tienen `clubId` para aislamiento multi-tenant.

---

## Club (raíz del tenant)

```
Club
├── id           String (cuid, PK)
├── name         String
├── slug         String (UNIQUE) ← usado en URLs
├── email        String?
├── logo         String?
├── sport        String (default: "BASKETBALL")
├── plan         String (STARTER | PRO | ENTERPRISE)
├── country      String (default: "CO")
├── city         String?
│
├── billingCycleDay      Int   ← día del mes que empieza el ciclo
├── earlyPaymentDays     Int   ← días para pago anticipado con descuento
├── earlyPaymentDiscount Float ← valor del descuento en COP
├── zonePrices   Json?         ← { "SUR": 80000, "CENTRO": 90000 }
│
└── → users, categories, sessions, payments, missions, rewards, invites, players
```

## User (autenticación)

```
User
├── id             String (cuid)
├── clubId         String → Club
├── name, email, password
├── role           ADMIN | COACH | PLAYER | PARENT
├── phone, branch, emergencyContact, eps
├── avatar, avatarPending, avatarStatus (NONE|PENDING|APPROVED|REJECTED)
├── coachCategoryId String? → Category (categoría que entrena)
├── coachCategoryIds String (JSON array, múltiples categorías)
└── → playerProfile, parentProfile, notifications, coachSessions
```

## Player (perfil deportivo del jugador)

```
Player
├── id          String (cuid)
├── clubId      String → Club
├── userId      String (UNIQUE) → User
├── categoryId  String? → Category
├── zone        String? (para precios por zona)
├── dateOfBirth, documentNumber, address, phone, joinDate
├── paymentDay  Int?    ← día del mes para su cobro
├── monthlyAmount Float? ← cuota mensual personalizada
├── position, jerseyNumber
├── status      ACTIVE | PENDING | INACTIVE
│
├── xp, level, streak, lastActive ← gamificación
│
└── → attendances, payments, playerMissions, rewards, evidences, uniformOrders, playerNotes
```

## Session (entrenamiento / partido / evento)

```
Session
├── id          String (cuid)
├── clubId      String → Club
├── title       String
├── type        TRAINING | MATCH | EVENT
├── date        DateTime
├── categoryId  String? → Category
├── coachId     String? → User
├── notes       String?
└── → attendances[]
```

## Attendance (asistencia por sesión)

```
Attendance
├── playerId  → Player
├── sessionId → Session
└── status    PRESENT | ABSENT | LATE | EXCUSED
(UNIQUE: playerId + sessionId)
```

## Payment (cobros mensuales)

```
Payment
├── clubId, playerId → Club, Player
├── amount    Float
├── concept   String
├── status    PENDING | SUBMITTED | COMPLETED | OVERDUE
├── dueDate   DateTime  ← fecha límite de pago
├── paidAt    DateTime?
├── paymentMethod String?
├── proofUrl  String?   ← comprobante subido por el jugador/padre
└── proofNote String?
```

**Flujo de un pago:**
`PENDING` → jugador sube comprobante → `SUBMITTED` → admin confirma → `COMPLETED`
Si pasa la `dueDate` sin pagar → cron lo marca `OVERDUE`

## Gamificación

```
Mission
├── clubId, title, description, xpReward
├── type   DAILY | WEEKLY | CHALLENGE | SPECIAL
└── isActive Boolean

PlayerMission
├── playerId, missionId
├── status   ACTIVE | COMPLETED | EXPIRED
├── progress / target (e.g. 3/5 asistencias)
└── → evidences[]

Evidence (foto/proof de misión)
├── playerId, playerMissionId
├── url, filename, mimeType, size
└── status  PENDING | ACCEPTED | REJECTED

Reward
├── title, description, icon
└── levelRequired Int

PlayerReward
└── playerId, rewardId, earnedAt
```

## Notificaciones

```
Notification
├── userId → User
├── title, message
├── type   INFO | ALERT | ACHIEVEMENT | PAYMENT | ATTENDANCE
├── isRead Boolean
└── link   String?

PushSubscription
├── userId
└── endpoint, p256dh, auth ← credenciales Web Push
```

## Otros Modelos

```
Category        ← grupos de edad (Mini, Sub-12, Sub-15, etc.)
Parent          ← perfil padre/madre, vinculado a User con role=PARENT
ParentPlayer    ← relación N:M padre ↔ jugador
Invite          ← códigos de invitación con expiración
UniformOrder    ← pedidos de uniforme
PlayerNote      ← notas de entrenador/admin sobre un jugador
AccessCode      ← códigos SaaS para que clubes nuevos se registren
```

---

Ver también: [[Ciclo de Pagos]] | [[Gamificación]] | [[Roles y Permisos]]
