# Playwright MCP

← [[000 - Inicio]] | [[Stack Tecnológico]]

---

## Qué es

Playwright MCP es un servidor MCP oficial de Microsoft que permite a Claude controlar un browser Chromium/Firefox/WebKit directamente, usando el árbol de accesibilidad (sin visión — más eficiente en tokens).

Sirve para: auditar la app, probar flujos de UI, hacer scraping, simular usuarios de distintos roles.

---

## Estado de instalación (2026-05-03)

| Componente | Estado |
|---|---|
| Node.js | v24.14.1 ✅ |
| Chromium binarios | Instalados en `C:\Users\Usuario\AppData\Local\ms-playwright\chromium-1217` ✅ |
| MCP registrado | `claude mcp add playwright npx @playwright/mcp@latest` → ✅ Connected |
| Config guardada | `C:\Users\Usuario\.claude.json` (proyecto Star App) |

---

## Cómo usarlo

**⚠️ IMPORTANTE:** Las herramientas de Playwright MCP **solo funcionan en el CLI de Claude Code** (`claude` en terminal), NO en la extensión de VSCode. En VSCode, el MCP aparece como conectado pero las herramientas no se inyectan en la conversación.

### Con el CLI

```bash
# Levantar el servidor de desarrollo primero
cd "c:\Users\Usuario\Desktop\Star App\star-club"
npm run dev
# → localhost:3000

# Luego en otro terminal, iniciar Claude Code CLI
claude
```

Y pedirle a Claude: _"Usa Playwright para navegar a localhost:3000 y probar el flujo de login como admin"_

---

## Dev server

| Dato | Valor |
|---|---|
| Comando | `npm run dev` en `star-club/` |
| URL | `http://localhost:3000` |
| Credenciales admin | `admin@starclub.com` / `admin123` |
| Slug Star Club | `star-club` |
| Slug Ball Breakers | `ball-breakers` |

---

## Herramientas expuestas por el MCP

50+ tools organizadas en:
- Navegación: abrir URL, back/forward
- Interacción: click, type, fill forms
- Tabs: crear, cerrar, cambiar
- Screenshots: capturar página o elemento
- Accesibilidad: snapshot del DOM accesible
- Network: mock de requests
- Storage: cookies, localStorage

---

## Paquete npm

```
@playwright/mcp  (oficial Microsoft)
```

No requiere instalar en el proyecto — corre via `npx` on-demand.

Ver también: [[Stack Tecnológico]]
