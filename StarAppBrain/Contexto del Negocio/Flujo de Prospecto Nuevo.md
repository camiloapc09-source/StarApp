# Flujo de Prospecto Nuevo

← [[000 - Inicio]] | [[Protocolo de Identificación de Contacto]]

Cómo la IA maneja a alguien que escribe preguntando por el club por primera vez.

---

## Secuencia de conversación

```
Paso 1 — Identificar quién es
→ Ver [[Protocolo de Identificación de Contacto]]

Paso 2 — Entender el interés
"¿Qué edad tiene tu hijo/a?" (si es padre)
o
"¿Cuántos años tienes?" (si es el chico)

Paso 3 — Mapear a una categoría
→ Con la edad, la IA consulta las categorías del club
→ "Perfecto, estaría en la categoría [X]"

Paso 4 — Dar info clave
- Horarios de entrenamiento de esa categoría
- Cuota mensual
- Dónde queda el club (dirección / ubicación)
- Qué incluye (uniforme, torneos, etc.)

Paso 5 — Call to action
"¿Le gustaría que le enviara el enlace para registrarse?"
→ Si sí: la IA genera un Invite (POST /api/invites) y lo comparte
→ Si no: "Con gusto le ayudo cuando quiera, queda pendiente"
```

---

## Info de Star Club para responder prospectos

| Dato | Valor |
|---|---|
| Nombre del club | Star Club ⭐ |
| Deporte | Baloncesto 🏀 |
| Sede | Parque La Inmaculada, Barrio Las Palmas, Cl. 37c #5a-58 |
| Miércoles | 4:30 pm – 6:30 pm |
| Viernes | 5:30 pm – 7:15 pm |
| Primer entrenamiento | **GRATIS** (de cortesía para nuevos) |
| Cuota mensual | $70.000 COP |

### Categorías y cómo asignarlas por edad

| Edad del jugador | Categoría |
|---|---|
| 8 a 12 años | U-12 |
| 12 a 15 años | U-15 |
| 15 a 18 años | U-18 |
| 18 años o más | Senior |

> Todos los jugadores entrenan los mismos días y horarios — no hay horarios distintos por categoría.

---

## Respuesta de ejemplo (padre)

> "Hola, bienvenida. Con 11 años su hijo estaría en la categoría U-12 ⭐
> Entrenamos miércoles de 4:30 a 6:30pm y viernes de 5:30 a 7:15pm en el Parque La Inmaculada, Barrio Las Palmas (Cl. 37c #5a-58).
> El primer entrenamiento es de cortesía, sin costo. La mensualidad es de $70.000 COP.
> ¿Le gustaría venir a conocernos?"

## Respuesta de ejemplo (chico)

> "¡Hola! Con 13 años entrarías a la U-15, ese equipo está muy bueno 🔥🏀
> Entrenamos miércoles a las 4:30 y viernes a las 5:30 en el Parque La Inmaculada (Las Palmas).
> El primer entrenamiento es gratis, ¿te animas a venir?"

---

Ver también: [[Ciclo de Pagos]] | [[Flujo de Onboarding]]
