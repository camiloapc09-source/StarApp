# Stack Tecnológico

← [[000 - Inicio]]

---

## Framework y Runtime

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router) |
| Lenguaje | TypeScript |
| Runtime deploy | Node.js en Render |
| DB | PostgreSQL (Neon serverless) |
| ORM | Prisma |
| Auth | NextAuth.js (credentials) |

## Frontend

| Capa | Tecnología |
|---|---|
| UI | Tailwind CSS |
| Componentes | shadcn/ui |
| Icons | Lucide React |
| Fuente | Geist (Vercel) |

## Servicios Externos

| Servicio | Para qué |
|---|---|
| **Neon** | PostgreSQL serverless (producción) |
| **Resend** | Emails transaccionales |
| **Web Push (VAPID)** | Notificaciones push en browser/móvil |
| **Cloudinary / Storage** | Fotos de comprobantes y avatares |
| **Render** | Hosting del servidor Next.js |

## Estructura de Carpetas Clave

```
star-club/
├── src/
│   ├── app/
│   │   ├── [clubSlug]/      ← UI de cada club (multi-tenant)
│   │   │   ├── dashboard/
│   │   │   ├── admin/
│   │   │   └── ...
│   │   ├── api/             ← Todos los endpoints REST
│   │   ├── login/
│   │   ├── register/
│   │   └── superadmin/      ← Panel global de StarApp
│   ├── generated/prisma/    ← Cliente Prisma auto-generado
│   └── lib/                 ← Utilidades, auth config
├── prisma/
│   └── schema.prisma        ← Fuente de verdad de la DB
└── public/                  ← Assets estáticos
```

## Multi-tenancy

Cada club tiene:
- Un `slug` único (e.g. `club-star`)
- Todas las rutas prefijadas con `/:clubSlug/`
- Sus propios usuarios, jugadores, sesiones, pagos — completamente aislados

El `clubId` está en prácticamente **todos** los modelos de la DB como clave de aislamiento.

## Autenticación

- NextAuth con `CredentialsProvider` (email + password hasheado)
- Roles: `ADMIN | COACH | PLAYER | PARENT`
- Cada sesión lleva `clubId` + `role` en el token JWT

## Deploy

- Render detecta el repositorio y hace build automático en cada push a `main`
- Build script: `prisma generate && prisma db push --accept-data-loss && next build`
  - `prisma generate` → regenera el cliente TypeScript
  - `prisma db push` → aplica cambios del schema a la DB de Neon (columnas nuevas, etc.)
  - Sin este paso, las columnas nuevas existen en el código pero no en la DB → crashea en runtime
- Variables de entorno en Render: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `RESEND_API_KEY`, claves VAPID

Ver también: [[Rutas API]]
