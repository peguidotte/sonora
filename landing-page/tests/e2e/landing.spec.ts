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
  await expect(page.locator(".device-visual")).toHaveAttribute(
    "data-layer",
    "capture",
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
  await page.goto("/api-docs.html");
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

test("docs is a separate page and returns to product", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#api-form")).toHaveCount(0);
  await page
    .getByRole("link", { name: "API Docs ↗", exact: true })
    .first()
    .click();
  await expect(page).toHaveURL(/api-docs.html$/);
  await expect(page.locator("h1")).toHaveText("Sonora API Docs.");
  await page.locator('[data-route="health"]').click();
  await expect(page.locator("#api-endpoint")).toHaveValue("health");
  await page.getByRole("link", { name: "← Voltar ao produto" }).click();
  await expect(page.locator("h1")).toContainText("Toda cidade");
});
for (const width of [320, 390, 768, 1440])
  test(`docs responsive ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/api-docs.html");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await expect(page.locator("#api-form")).toBeVisible();
  });

test("device reduced motion remains legible and installation controls work", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/#dispositivo");
  await expect(page.locator("#device-concept-image")).toBeVisible();
  await expect(page.locator("#device-canvas canvas")).toHaveCount(0);
  await page.locator('[data-install="outlet"]').click();
  await expect(page.locator("#installation-note")).toContainText("tomada");
  await expect(page.locator("#device-concept-image")).toHaveAttribute(
    "src",
    "./images/device-outlet.webp",
  );
  await page.locator('[data-component="processing"]').click();
  await expect(page.locator("#component-processing")).toBeVisible();
});

test("every reference entry opens its local example, including HTML and 204", async ({
  page,
}) => {
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "fetch" || request.resourceType() === "xhr")
      apiCalls.push(request.url());
  });
  await page.goto("/api-docs.html");
  const entries = page.locator("[data-route]");
  await expect(entries).toHaveCount(9);
  const run = page.getByRole("button", { name: "Executar simulação" });
  for (const entry of await entries.all()) {
    const key = await entry.getAttribute("data-route");
    await entry.click();
    await expect(page.locator("#api-endpoint")).toHaveValue(key!);
    await run.click();
    await expect(page.locator("#api-status")).toContainText("200");
    if (key === "dashboard") {
      await expect(page.locator("#api-format")).toHaveText("text/html");
      await expect(page.locator("#api-response")).toContainText(
        "<!doctype html>",
      );
      await expect(page.locator("#api-response *")).toHaveCount(0);
    }
    if (key === "summary") {
      await page.locator("#api-scenario").selectOption("empty");
      await run.click();
      await expect(page.locator("#api-status")).toContainText("204");
    }
  }
  expect(apiCalls).toEqual([]);
});

test("opening reveals the city, pauses, and respects a change in motion preference", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const reveal = page.locator(".city-reveal");
  await expect(reveal).toHaveCSS("animation-name", /city-listen/);
  const asset = await reveal.evaluate(
    (el) => getComputedStyle(el).backgroundImage,
  );
  const image = await page.request.get(asset.slice(5, -2));
  expect(image.headers()["content-type"]).toContain("image/webp");
  await page.locator("#motion-toggle").click();
  await expect(reveal).toHaveCSS("animation-play-state", /paused/);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(reveal).toHaveCSS("animation-name", "none");
  await expect(page.locator(".hero-art img")).toHaveCSS("filter", "none");
});
