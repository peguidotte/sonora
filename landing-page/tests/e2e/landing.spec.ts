import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("interactive journey, no-data, device and architecture", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("h1")).toContainText("Toda cidade");
  await page.getByRole("button", { name: "Noite", exact: true }).click();
  await expect(page.locator(".period-label")).toHaveText("18h–00h");
  await expect(page.locator(".demo-map img")).toHaveAttribute(
    "src",
    "./images/city-night.webp",
  );
  await page.getByRole("button", { name: "Sem dados", exact: true }).click();
  await expect(page.locator(".reading strong")).toHaveText("—");
  await page.getByRole("button", { name: "Manhã", exact: true }).click();
  await expect(page.locator(".bar")).toHaveCount(6);
  await page.locator('[data-component="capture"]').click();
  await expect(page.locator("#device-concept-image")).toHaveAttribute(
    "src",
    "./images/device-exploded.webp",
  );
  await page.locator("[data-step=database]").click();
  await expect(page.locator("#step-title")).toHaveText(
    "Um contrato compartilhado.",
  );
  await page.getByText("O Sonora garante um imóvel silencioso?").click();
  await expect(page.locator(".questions details").first()).toHaveAttribute(
    "open",
    "",
  );
  expect(errors).toEqual([]);
});
test("reduced motion, explicit opt in and pause", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#motion-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.locator("#motion-toggle").click();
  await expect(page.locator("#motion-toggle")).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await page.locator("#motion-toggle").click();
  await expect(page.locator("#motion-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
for (const width of [320, 390, 768, 1440, 1920])
  test(`responsive ${width}, images loaded`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page
        .locator(".hero-art img")
        .evaluate((im: HTMLImageElement) => im.complete && im.naturalWidth > 0),
    ).toBeTruthy();
  });
test("mobile menu repeats, Escape and navigation close", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#mobile-nav")).toBeHidden();
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await page
    .locator("#mobile-nav")
    .getByRole("link", { name: "O dispositivo" })
    .click();
  await expect(page.locator("#mobile-nav")).toBeHidden();
  await expect(page).toHaveURL(/#dispositivo$/);
});
test("WCAG scan", async ({ page }) => {
  await page.goto("/");
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(result.violations).toEqual([]);
});
test("API playground never needs a key and changes scenarios", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .locator("#api-form")
    .getByRole("button", { name: "Executar simulação" })
    .click();
  await expect(page.locator("#api-status")).toHaveText(
    "200 · resposta simulada",
  );
  await page.locator("#api-scenario").selectOption("unauthorized");
  await page
    .locator("#api-form")
    .getByRole("button", { name: "Executar simulação" })
    .click();
  await expect(page.locator("#api-status")).toHaveText(
    "401 · resposta simulada",
  );
  await page.locator("#api-endpoint").selectOption("health");
  await page
    .locator("#api-form")
    .getByRole("button", { name: "Executar simulação" })
    .click();
  await expect(page.locator("#api-response")).toContainText('"status": "ok"');
});
