# Modelo de Negocio SaaS

← [[000 - Inicio]]

> **COMPLETAR** — Llenar con la info real del negocio.

---

## Planes

| Plan | Precio/mes | Límites | Características |
|---|---|---|---|
| STARTER | ? | ? jugadores | Funciones básicas |
| PRO | ? | ? jugadores | + reportes, + gamificación |
| ENTERPRISE | ? | Sin límite | Todo + soporte prioritario |

## Cómo entra un club nuevo

1. Yo (SUPERADMIN) genero un `AccessCode` con el plan acordado
2. Le envío el código al admin del club
3. El admin se registra en `/register` con ese código
4. El código queda marcado como `used`

## Ingresos

- Modelo de suscripción mensual por club
- Los cobros son externos a la plataforma (transferencia, Wompi, etc.) — StarApp no procesa pagos SaaS, solo los registra manualmente generando el AccessCode

## Control de acceso SaaS

- Sin `AccessCode` válido: no se puede crear un club
- El SUPERADMIN controla qué códigos existen y cuáles se han usado
- Cada código registra: quién lo usó, cuándo, y qué club creó

---

## Métricas que la IA debería rastrear

- [ ] Clubes activos totales
- [ ] Jugadores activos totales (suma de todos los clubes)
- [ ] Tasa de pagos al día vs vencidos (por club)
- [ ] Clubes con más engagement (más sesiones registradas)
- [ ] Códigos de acceso sin usar (posibles ventas pendientes)

---

Ver también: [[Quién es el Cliente]] | [[Roles y Permisos]]
