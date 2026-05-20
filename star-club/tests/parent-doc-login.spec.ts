import { test, expect } from "@playwright/test";

/**
 * Tests para el flujo de login de padres con documento del hijo.
 *
 * Setup en DB (aplicado via Neon antes de correr este archivo):
 *   - test-parent-playwright-001 (Padre Test Playwright)
 *     email: setup.test.playwright@mailtest.com
 *     clubId: club-ballbreakers  /  slug: ballbreakers
 *     setupCompleted: false
 *     password: hash("1043466721")  ← documento de TIARET SOFÍA BATISTA CASTRO
 *     hijo vinculado: cmpec82u300022fo0ustry6a0 (TIARET, doc: 1043466721)
 *     — Sin @bb.internal con ese doc → activa el NUEVO fallback de auth.ts
 *
 *   - Para test 8+9: padre star-club 1042860296@bb.internal
 *     Hijo: Daniel Alejandro mejia Alvarez (doc: 1042860296)
 */

const BASE   = "https://starapp-9qb7.onrender.com";
const BB_URL = `${BASE}/ballbreakers`;
const SC_URL = `${BASE}/star-club`;

const CHILD_DOC   = "1043466721";                         // doc de TIARET → usuario + clave temporal
const SETUP_EMAIL = "setup.test.playwright@mailtest.com"; // email actual del test parent (sin conflicto)
const NEW_PASS    = "newpass123";

const ADMIN_EMAIL = "admin@starclub.com";
const ADMIN_PASS  = "admin123";

async function login(page: any, url: string, user: string, password: string) {
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.locator('input[placeholder="Correo o documento"]').fill(user);
  await page.locator('input[placeholder="Contraseña"]').fill(password);
  await page.getByRole("button", { name: "Entrar" }).click();
}

// ─────────────────────────────────────────────────────────────
// SUITE 1: Login de padre con documento del hijo (nuevo fallback)
// ─────────────────────────────────────────────────────────────
test.describe("Login con documento del hijo", () => {

  test("1 · padre ingresa con doc del hijo → redirige a /setup", async ({ page }) => {
    await login(page, BB_URL, CHILD_DOC, CHILD_DOC);
    await page.waitForURL(/\/setup/, { timeout: 40_000 });
    await expect(page).toHaveURL(/dashboard\/parent\/setup/);
    console.log(`✓ URL: ${page.url()}`);
  });

  test("2 · clave incorrecta → no entra", async ({ page }) => {
    await login(page, BB_URL, CHILD_DOC, "clave_incorrecta");
    await page.waitForTimeout(4_000);
    await expect(page).not.toHaveURL(/dashboard/);
    console.log("✓ Clave incorrecta rechazada");
  });

  test("3 · padre completa /setup y llega al dashboard", async ({ page }) => {
    await login(page, BB_URL, CHILD_DOC, CHILD_DOC);
    await page.waitForURL(/\/setup/, { timeout: 40_000 });

    // Esperar que el listado de jugadores cargue
    await page.waitForSelector('[data-testid="player-item"]', { timeout: 20_000 });

    // Rellenar formulario (email ya pre-cargado; se mantiene igual = sin conflicto)
    const emailInput = page.locator('input[type="email"]');
    await emailInput.clear();
    await emailInput.fill(SETUP_EMAIL);

    const pwInputs = page.locator('input[type="password"]');
    await pwInputs.nth(0).fill(NEW_PASS);
    await pwInputs.nth(1).fill(NEW_PASS);

    // Asegurar que al menos 1 jugador está seleccionado
    const playerItems = page.locator('[data-testid="player-item"]');
    const count = await playerItems.count();
    if (count > 0) {
      // Si ninguno está seleccionado, hacer clic en el primero
      const firstItem = playerItems.first();
      const ariaSelected = await firstItem.getAttribute("aria-selected").catch(() => null);
      const bgStyle = await firstItem.evaluate((el: HTMLElement) => el.style.background);
      if (!bgStyle.includes("139,92,246")) {
        await firstItem.click();
      }
    }

    await page.getByRole("button", { name: /Guardar/i }).click();

    // Esperar redireccion al dashboard (NO /setup)
    await page.waitForURL(
      (url) => url.pathname === "/dashboard/parent",
      { timeout: 45_000 }
    );
    await expect(page).not.toHaveURL(/setup/);
    console.log(`✓ Setup completado → ${page.url()}`);
  });

  test("4 · tras setup, el padre entra con email+clave normalmente", async ({ page }) => {
    await login(page, BB_URL, SETUP_EMAIL, NEW_PASS);
    await page.waitForURL(
      (url) => url.pathname === "/dashboard/parent",
      { timeout: 40_000 }
    );
    await expect(page).not.toHaveURL(/setup/);
    console.log(`✓ Login post-setup: ${page.url()}`);
  });

});

// ─────────────────────────────────────────────────────────────
// SUITE 2: Panel de admin — Acudientes
// ─────────────────────────────────────────────────────────────
test.describe("Panel admin: Acudientes", () => {

  test("5 · página /parents carga con la lista de acudientes", async ({ page }) => {
    await login(page, SC_URL, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL(/dashboard\/admin/, { timeout: 40_000 });

    await page.goto(`${BASE}/dashboard/admin/parents`, { waitUntil: "load", timeout: 30_000 });

    // Usar heading específico para evitar strict-mode con múltiples "Acudientes"
    await expect(page.getByRole("heading", { name: "Acudientes" })).toBeVisible({ timeout: 15_000 });
    // Verificar subtítulo con conteo de acudientes
    const subtitle = page.locator("text=/acudientes/i").first();
    await expect(subtitle).toBeVisible({ timeout: 10_000 });
    console.log("✓ Página /parents OK");
  });

  test("6 · botón Resetear al documento del hijo aparece en el modal (desde /parents)", async ({ page }) => {
    await login(page, SC_URL, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL(/dashboard\/admin/, { timeout: 40_000 });

    await page.goto(`${BASE}/dashboard/admin/parents`, { waitUntil: "load", timeout: 30_000 });
    await expect(page.getByRole("heading", { name: "Acudientes" })).toBeVisible({ timeout: 15_000 });

    // Clic en el primer botón "Resetear contraseña" de la lista
    const resetTrigger = page.getByRole("button", { name: /Resetear contraseña/i }).first();
    await expect(resetTrigger).toBeVisible({ timeout: 10_000 });
    await resetTrigger.click();

    // Dentro del modal debe aparecer la opción para PARENT
    const docBtn = page.getByRole("button", { name: /Resetear al documento del hijo/i });
    await expect(docBtn).toBeVisible({ timeout: 8_000 });
    console.log("✓ Modal muestra 'Resetear al documento del hijo'");
  });

  test("7 · API reset error si padre sin hijos con documento", async ({ page }) => {
    await login(page, SC_URL, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL(/dashboard\/admin/, { timeout: 40_000 });

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/admin/players/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "cmnnhf5co000p2bjkm28bjnmb", resetToDocument: true }),
      });
      const data = await res.json();
      return { status: res.status, error: data.error };
    });

    expect(result.status).toBe(400);
    console.log(`✓ Error esperado: "${result.error}"`);
  });

  test("8 · API reset para padre con hijo → devuelve doc y pone setupCompleted=false", async ({ page }) => {
    await login(page, SC_URL, ADMIN_EMAIL, ADMIN_PASS);
    await page.waitForURL(/dashboard\/admin/, { timeout: 40_000 });

    const result = await page.evaluate(async () => {
      const res = await fetch("/api/admin/players/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "cmnnn8jjf000b1sgba9pkrbb0", resetToDocument: true }),
      });
      const data = await res.json();
      return { status: res.status, tempPassword: data.tempPassword, resetToDocument: data.resetToDocument };
    });

    expect(result.status).toBe(200);
    expect(result.tempPassword).toBe("1042860296");
    expect(result.resetToDocument).toBe(true);
    console.log(`✓ Reset OK — clave temporal: "${result.tempPassword}"`);
  });

});

// ─────────────────────────────────────────────────────────────
// SUITE 3: Regresión — @bb.internal sigue funcionando
// ─────────────────────────────────────────────────────────────
test.describe("Regresión: @bb.internal sigue funcionando", () => {

  test("9 · padre @bb.internal entra con doc del hijo → redirige a /setup", async ({ page }) => {
    // Test 8 dejó al padre 1042860296@bb.internal con clave=hash("1042860296") y setupCompleted=false
    await login(page, SC_URL, "1042860296", "1042860296");
    await page.waitForURL(/\/setup/, { timeout: 40_000 });
    await expect(page).toHaveURL(/dashboard\/parent\/setup/);
    console.log(`✓ @bb.internal redirigido a setup: ${page.url()}`);
  });

});
