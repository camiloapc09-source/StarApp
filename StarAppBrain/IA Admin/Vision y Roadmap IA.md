# Visión y Roadmap — IA Admin

← [[000 - Inicio]]

---

## La visión

> StarApp tiene todos los datos y la API. La IA es el administrador que nunca duerme.

En lugar de que el admin tenga que acordarse de cobrar, de crear sesiones, de responder mensajes — una IA con acceso a la API de StarApp y a este vault hace todo eso automáticamente, y solo interrumpe al humano cuando hay una decisión real que tomar.

---

## Qué aprendimos de nanochat (Karpathy)

nanochat demuestra que puedes entrenar un LLM desde cero con datos específicos de tu dominio. La idea que adaptamos aquí:

- **El vault de Obsidian = el corpus de entrenamiento / contexto**
  Cada nota es conocimiento estructurado sobre StarApp: sus reglas de negocio, su DB, sus flujos.

- **Claude/GPT = el LLM que opera sobre ese corpus**
  En lugar de entrenar desde cero, le pasamos el vault como contexto en cada llamada.

- **La API de StarApp = las "herramientas" del agente**
  El LLM puede leer datos (GET) y ejecutar acciones (POST/PATCH) como si fuera un admin.

Este es un patrón llamado **LLM + Tool Use** — no necesitas entrenar nada, solo darle al LLM:
1. Contexto (las notas del vault)
2. Herramientas (los endpoints de la API)
3. Objetivos (las tareas que debe cumplir)

---

## Fases del Roadmap

### Fase 1 — Cerebro documentado (AHORA ✅)
- Este vault con toda la documentación
- Cualquier dev o IA puede entender StarApp leyendo este vault
- Claude Code usa este vault en cada conversación

### Fase 2 — IA con lectura (próximo)
- Claude puede consultar la DB en tiempo real via Neon MCP
- Puede responder preguntas como "¿cuántos jugadores tienen pagos vencidos?"
- Sin escribir nada — solo lectura + respuesta

### Fase 3 — IA con acciones supervisadas
- Claude propone acciones ("voy a marcar 3 pagos como OVERDUE")
- El admin aprueba con un clic
- Claude ejecuta la acción via API

### Fase 4 — IA autónoma con límites
- Acciones de bajo riesgo → se ejecutan solas (enviar notificación, marcar overdue)
- Acciones de alto riesgo → requieren aprobación (eliminar usuario, cambiar monto)
- Reporte diario al admin de lo que hizo la IA

---

## Stack para implementar la IA Admin

```
Trigger (cron / webhook / mensaje del admin)
    ↓
Claude API (claude-sonnet-4-6 o superior)
  + contexto: notas del vault relevantes
  + herramientas: endpoints de StarApp como tools
    ↓
Claude decide qué hacer
    ↓
Llama la API de StarApp con token de admin
    ↓
Registra la acción (log en DB o en el vault)
    ↓
Notifica al admin si es necesario
```

---

## Preguntas que necesito responder para avanzar

- [ ] ¿Cuál es el canal de mensajes que quieres que la IA atienda? (¿WhatsApp Business? ¿mensajes dentro de la app? ¿email?)
- [ ] ¿Qué "vencimientos" son los más críticos hoy? (pagos, sesiones sin crear, invitaciones expiradas?)
- [ ] ¿Qué tan autónoma quieres que sea? ¿Todo supervisado o puede actuar sola en algunas cosas?
- [ ] ¿Hay lógica de negocio crítica que no está documentada aquí todavía?

Ver también: [[Tareas Automatizables]] | [[Protocolo de Decisiones]]
