import { test } from "@playwright/test";

test("capture login page structure", async ({ page }) => {
  await page.goto("https://starapp-9qb7.onrender.com/ballbreakers", { waitUntil: "networkidle", timeout: 60_000 });
  await page.screenshot({ path: "tests/screenshots/login-page.png", fullPage: true });

  // Print all input elements
  const inputs = await page.locator("input").all();
  for (const input of inputs) {
    const type = await input.getAttribute("type");
    const name = await input.getAttribute("name");
    const placeholder = await input.getAttribute("placeholder");
    console.log(`INPUT: type="${type}" name="${name}" placeholder="${placeholder}"`);
  }

  // Print all button texts
  const buttons = await page.locator("button").all();
  for (const btn of buttons) {
    const text = await btn.innerText().catch(() => "");
    console.log(`BUTTON: "${text.trim()}"`);
  }

  // Print page title
  const title = await page.title();
  console.log(`PAGE TITLE: ${title}`);
  console.log(`PAGE URL: ${page.url()}`);
});
