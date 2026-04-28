# Canal de Comunicación

← [[000 - Inicio]] | [[Quién es el Cliente]]

> **PENDIENTE** — Definir cuál es el canal oficial de comunicación con los padres.

---

## La pregunta crítica

Para que la IA pueda atender mensajes, necesito saber **dónde** llegan esos mensajes.

Las opciones más comunes:

| Canal | Cómo conectar la IA |
|---|---|
| **WhatsApp Business** | WhatsApp Business API (Meta) → webhook → IA responde |
| **Instagram DM** | Instagram Graph API → webhook → IA responde |
| **Mensajes dentro de la app** | Ya existe el modelo Notification — agregar mensajería interna |
| **Email** | Resend ya está conectado — agregar un inbox |
| **Todos los anteriores** | Centralizar en un sistema de bandeja unificada |

---

## Dos flujos distintos que la IA debe manejar

### Flujo 1 — Padre ya registrado escribe sobre pagos
```
Padre escribe: "¿Ya me llegó el pago?"
    ↓
IA consulta DB: busca sus payments por userId
    ↓
Responde con el estado actual:
"Hola [nombre], tu pago de abril está confirmado ✓"
o
"Hola [nombre], aún tienes un pago pendiente de $80.000 vencido el 15 de abril"
```

### Flujo 2 — Prospecto nuevo pregunta por el club
```
Alguien escribe: "Hola, quiero inscribir a mi hijo"
    ↓
IA responde con info del club:
- Categorías disponibles (edades)
- Horarios de entrenamiento
- Cuota mensual
- Cómo inscribirse (código de invitación)
    ↓
Si está interesado → IA genera Invite y lo envía
o → IA le dice que el admin lo contactará
```

---

## Una vez definido el canal, el siguiente paso es:

1. Conectar el webhook del canal a un endpoint en StarApp
2. Ese endpoint llama a Claude con el contexto del mensaje + las notas del vault
3. Claude responde (o propone respuesta si es algo delicado)
4. La respuesta se envía por el mismo canal

---

Ver también: [[Vision y Roadmap IA]] | [[Tareas Automatizables]] | [[Ciclo de Pagos]]
