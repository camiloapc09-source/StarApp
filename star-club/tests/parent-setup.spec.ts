import { test, expect } from "@playwright/test";

/**
 * Test account: 9999999999 / test1234  (email: 9999999999@bb.internal)
 * Club login: https://starapp-9qb7.onrender.com/ballbreakers
 * Player used for linking: Emy Sarmiento (cmohtlevo000k1ti7mwi6w8r5)
 */

const BASE         = "https://starapp-9qb7.onrender.com";
const LOGIN        = `${BASE}/ballbreakers`;
const DOC          = "9999999999";
const PASSWORD     = "test1234";
const NEW_EMAIL    = "setup.test.playwright@mailtest.com";
const NEW_PASSWORD = "newpass123";
// A real active player ID in the Ball Breakers club
const TEST_PLAYER_ID = "cmohtlevo000k1ti7mwi6w8r5";

async function doLogin(page: any, user = DOC, pass = PASSWORD) {
  await page.goto(LOGIN, { waitUntil: "load", timeout: 60_000 });
  await page.locator('input[placeholder="Correo o documento"]').fill(user);
  await page.locator('input[placeholder="Contraseña"]').fill(pass);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test.describe("Parent first-login setup flow", () => {

  test("1 · login con documento → redirige a /setup", async ({ page }) => {
    await doLogin(page);
    await page.waitForURL(/dashboard\/parent\/setup/, { timeout: 30_000 });
    await expect(page).toHaveURL(/dashboard\/parent\/setup/);
    await expect(page.getByRole("heading", { name: "Configura tu cuenta" })).toBeVisible();
  });

  test("2 · página de setup tiene sección de credenciales", async ({ page }) => {
    await doLogin(page);
    await page.waitForURL(/dashboard\/parent\/setup/, { timeout: 30_000 });

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.getByText("Tu acceso")).toBeVisible();
  });

  test("3 · lista de jugadores carga correctamente", async ({ page }) => {
    await doLogin(page);
    await page.waitForURL(/dashboard\/parent\/setup/, { timeout: 30_000 });

    await expect(page.getByText("Tus hijos en el club")).toBeVisible();
    const playerList = page.locator(".max-h-56");
    await expect(playerList).toBeVisible({ timeout: 15_000 });
    const count = await playerList.locator("button").count();
    expect(count).toBeGreaterThan(0);
    console.log(`Jugadores en la lista: ${count}`);
  });

  test("4 · PATCH API: actualiza credenciales y vincula hijo", async ({ page }) => {
    // Login → land on /setup (proves redirect works)
    await doLogin(page);
    await page.waitForURL(/dashboard\/parent\/setup/, { timeout: 30_000 });

    // Wait for player list to confirm the page is fully loaded
    await page.locator(".max-h-56 button").first().waitFor({ state: "visible", timeout: 20_000 });

    // Call the PATCH API directly from the browser context (uses session cookies)
    const result = await page.evaluate(
      async ([email, password, playerId]: string[]) => {
        const res = await fetch("/api/parent/setup", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, playerIds: [playerId] }),
        });
        const data = await res.json();
        return { status: res.status, data };
      },
      [NEW_EMAIL, NEW_PASSWORD, TEST_PLAYER_ID]
    );

    console.log("PATCH result:", JSON.stringify(result));
    expect(result.status).toBe(200);
    expect(result.data.ok ?? result.data?.data?.ok).toBe(true);
  });

  test("5 · tras el setup: login directo al dashboard (sin /setup)", async ({ page }) => {
    // Depends on test 4 having called the PATCH API and set setupCompleted=true
    await doLogin(page, NEW_EMAIL, NEW_PASSWORD);
    await page.waitForURL(/dashboard\/parent/, { timeout: 40_000 });
    await expect(page).not.toHaveURL(/setup/);
    console.log(`✓ Login directo: ${page.url()}`);
  });

});
