# Protocolo de Decisiones de la IA

← [[000 - Inicio]] | [[Vision y Roadmap IA]] | [[Tareas Automatizables]]

Reglas de cómo la IA debe tomar decisiones al administrar StarApp.

---

## Principio base

> La IA nunca adivina. Si no tiene suficiente información, pregunta. Si la acción es irreversible, confirma.

---

## Árbol de decisión

```
¿La acción es de solo lectura (GET)?
  → Ejecutar sin preguntar

¿La acción puede revertirse fácilmente?
  → Ejecutar y notificar al admin después

¿La acción afecta dinero o datos de usuarios?
  → Proponer y esperar aprobación

¿La acción elimina datos permanentemente?
  → Bloquear, explicar, pedir confirmación explícita
```

---

## Contexto que la IA siempre debe tener

Antes de actuar, la IA carga:
1. Las notas relevantes del vault (reglas de negocio)
2. El estado actual en la DB (jugadores, pagos, sesiones)
3. El historial de acciones recientes (para no repetir)

---

## Formato de propuesta de acción

Cuando la IA va a hacer algo importante, lo presenta así:

```
📋 ACCIÓN PROPUESTA
─────────────────
Qué: Marcar 5 pagos como OVERDUE
Por qué: Su dueDate fue ayer (2026-04-22) y siguen en PENDING
Jugadores afectados: Juan P., María R., Carlos G., Ana M., Luis T.
Reversible: Sí (se puede volver a PENDING si hay error)
─────────────────
[✅ Confirmar] [❌ Cancelar] [📝 Ver detalles]
```

---

## Límites que la IA NUNCA cruza sin permiso explícito

- No elimina usuarios, jugadores ni padres
- No cambia montos de cuotas
- No envía emails masivos sin revisar el contenido
- No accede a datos de otros clubes
- No modifica la configuración de pagos del club

---

## Log de acciones

Cada acción que ejecuta la IA queda registrada:
- Timestamp
- Qué hizo
- Resultado
- Si fue autónoma o aprobada por el admin

Esto permite auditar y revertir si algo salió mal.

---

Ver también: [[Tareas Automatizables]] | [[Vision y Roadmap IA]]
