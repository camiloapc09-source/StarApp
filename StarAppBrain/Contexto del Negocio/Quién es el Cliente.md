# Quién es el Cliente

← [[000 - Inicio]]

---

## Dos tipos de clientes completamente distintos

### 1. Padres de Star Club (cliente final de la app)

Star Club es el club propio del dueño de StarApp. Los clientes directos aquí son **los padres** — ellos son los que pagan la mensualidad de sus hijos.

**Perfil del padre:**
- Tiene un hijo/a en el club de baloncesto
- Paga una cuota mensual
- Se comunica por mensajes (ver [[Canal de Comunicación]])
- Puede preguntar sobre el club cuando lo contactan por primera vez

**Lo que la IA debe manejar con los padres:**
- Cobros: saber cuándo escribirles, qué decirles, hacer seguimiento
- Responder preguntas de personas que contactan por primera vez sobre el club
- Notificaciones de pago vencido, próximo a vencer, comprobante recibido

**Lo que NO maneja la IA con los padres:**
- Decisiones deportivas (categorías, posiciones, etc.)
- Problemas físicos o lesiones de los jugadores
- Conflictos que requieran juicio humano

---

### 2. Dueños de clubes (clientes SaaS)

Los clubes que compran la plataforma StarApp. Este segmento lo maneja el dueño de StarApp manualmente — no es prioridad para la IA en esta fase.

**Estado:** Gestionado manualmente por el SUPERADMIN (el dueño).

---

## Prioridad para la IA Admin

```
Alta prioridad → Padres de Star Club (pagos + mensajes)
Baja prioridad → Dueños de clubes SaaS (manual por ahora)
```

---

## Pendiente de definir

- [ ] ¿Por qué canal escriben los padres? (¿WhatsApp? ¿Dentro de la app? ¿Email?)
- [ ] ¿Hay un número de WhatsApp de Star Club hoy?
- [ ] ¿Cómo llegan los prospectos nuevos que preguntan por el club? (Instagram DM, WhatsApp, referidos?)

Ver también: [[Canal de Comunicación]] | [[Ciclo de Pagos]] | [[Vision y Roadmap IA]]
