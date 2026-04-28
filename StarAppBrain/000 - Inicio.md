# 🧠 StarApp Brain — Mapa Central

> Este vault ES el cerebro de StarApp. Todo lo que la IA necesita saber para entender, operar y administrar la plataforma vive aquí.

---

## ¿Qué es StarApp?

StarApp es una plataforma **SaaS multi-tenant** de gestión de clubes deportivos. Cada club tiene su propio espacio (`/[clubSlug]/`), su propia base de datos de jugadores, sesiones, pagos y gamificación.

El producto está construido para administradores de clubes que necesitan controlar asistencia, cobros, comunicación con padres y motivación de jugadores — todo en un solo lugar.

---

## Navegación del Vault

### 🏗️ Arquitectura
- [[Stack Tecnológico]]
- [[Rutas API]]

### 🗃️ Base de Datos
- [[Schema Completo]]

### ⚙️ Features
- [[Gestión de Jugadores]]
- [[Sesiones y Asistencia]]
- [[Pagos y Facturación]]
- [[Gamificación]]
- [[Notificaciones y Push]]

### 📋 Reglas de Negocio
- [[Ciclo de Pagos]]
- [[Roles y Permisos]]
- [[Flujo de Onboarding]]

### 🤖 IA Admin
- [[Vision y Roadmap IA]]
- [[Tareas Automatizables]]
- [[Protocolo de Decisiones]]

### 🌍 Contexto del Negocio
- [[Quién es el Cliente]]
- [[Canal de Comunicación]]
- [[Protocolo de Identificación de Contacto]]
- [[Flujo de Prospecto Nuevo]]
- [[Star Club - Info Completa]] ← info real del club (horarios, tarifas, pagos)
- [[Ball Breakers - Info Completa]] ← ejemplo de cliente SaaS con ciclo configurable
- [[Modelo de Negocio SaaS]]

---

## Estado Actual del Sistema

| Módulo | Estado |
|---|---|
| Auth (NextAuth) | ✅ Producción |
| Jugadores / Padres | ✅ Producción |
| Sesiones y Asistencia | ✅ Producción |
| Pagos (manual + comprobante) | ✅ Producción |
| Gamificación (XP, Misiones, Recompensas) | ✅ Producción |
| Push Notifications (VAPID) | ✅ Producción |
| Email (Resend) | ✅ Producción |
| Uniformes | ✅ Producción |
| IA Admin Autónoma | 🔜 Roadmap |

---

## 📋 Memoria de Sesión

- [[📋 Sesion Actual]] ← **Leer siempre al inicio de cada conversación**

---

## Cómo usar este vault con IA

**Dos capas de memoria:**

| Capa | Archivo | Cuándo usar |
|---|---|---|
| Corto plazo | `📋 Sesion Actual.md` | Estado actual, pendientes, contexto de la sesión. Se limpia cuando ya no es relevante. |
| Largo plazo | Resto del vault | Reglas de negocio, arquitectura, info de clientes. Permanente. Solo se actualiza cuando algo cambia de verdad. |

**Protocolo:**
1. Al inicio → leer `📋 Sesion Actual.md` para saber dónde quedó
2. Trabajar → ir actualizando Sesion Actual con lo que se hace
3. Al terminar algo relevante → actualizar el archivo de largo plazo correspondiente
4. **NO usar compact** — el vault reemplaza eso y cuesta cero tokens extra
